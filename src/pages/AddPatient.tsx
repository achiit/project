import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ChildFormData {
  gender: 'Male' | 'Female' | 'Other';
  ageInYears: number;
}

interface PerformingDoctor {
  id: string;
  name: string;
  qualifications: string;
}

interface ReferringDoctor {
  id: string;
  name: string;
  hospital_name: string;
}

interface IndicationType {
  id: number;
  indication: string;
}

interface PatientFormData {
  // Basic Information
  name: string;
  age: number;
  husbandName: string;
  fatherName: string;
  presentAddress: string;
  aadharCardAddress: string;
  contactNumber: string;
  
  // Pregnancy Details
  lastMenstrualPeriod: string;
  numberOfChildrenAlive: number;
  children: ChildFormData[];

  // Procedure Details
  performingDoctorId: string;
  referringDoctorId: string;
  selectedIndications: number[];
  procedureDate: string;

  // Consent
  consentMobile: string;
  consentOtp: string;
}

export default function AddPatient() {
  const navigate = useNavigate();
  const { diagnosticCenter } = useAuth();
  const [step, setStep] = useState(1);
  const [performingDoctors, setPerformingDoctors] = useState<PerformingDoctor[]>([]);
  const [referringDoctors, setReferringDoctors] = useState<ReferringDoctor[]>([]);
  const [indicationTypes, setIndicationTypes] = useState<IndicationType[]>([]);
  const [showConsentOtp, setShowConsentOtp] = useState(false);
  const [consentVerified, setConsentVerified] = useState(false);
  const { register, handleSubmit, formState: { errors }, setError, watch, setValue } = useForm<PatientFormData>({
    defaultValues: {
      age: 18,
      numberOfChildrenAlive: 0,
      children: [],
      selectedIndications: [],
      procedureDate: new Date().toISOString().split('T')[0]
    }
  });

  const numberOfChildrenAlive = watch('numberOfChildrenAlive');

  useEffect(() => {
    fetchDoctors();
    fetchIndicationTypes();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data: performingData, error: performingError } = await supabase
        .from('performing_doctors')
        .select('id, name, qualifications')
        .eq('diagnostic_center_id', diagnosticCenter.id);

      if (performingError) throw performingError;
      setPerformingDoctors(performingData || []);

      const { data: referringData, error: referringError } = await supabase
        .from('referring_doctors')
        .select('id, name, hospital_name')
        .eq('diagnostic_center_id', diagnosticCenter.id);

      if (referringError) throw referringError;
      setReferringDoctors(referringData || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const fetchIndicationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('indication_types')
        .select('*')
        .order('id');

      if (error) throw error;
      setIndicationTypes(data || []);
    } catch (err) {
      console.error('Error fetching indication types:', err);
    }
  };

  const validatePhoneNumber = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value) || 'Please enter a valid 10-digit mobile number';
  };

  const validateLMP = (value: string) => {
    const lmpDate = new Date(value);
    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() - 9);
    
    if (lmpDate > today) {
      return 'LMP date cannot be in the future';
    }
    if (lmpDate < minDate) {
      return 'LMP date cannot be more than 9 months ago';
    }
    return true;
  };

  const addChild = () => {
    const currentChildren = watch('children') || [];
    setValue('children', [...currentChildren, { gender: 'Male', ageInYears: 0 }]);
  };

  const removeChild = (index: number) => {
    const currentChildren = watch('children') || [];
    setValue('children', currentChildren.filter((_, i) => i !== index));
  };

  const handleSendConsentOtp = async () => {
    const consentMobile = watch('consentMobile');
    if (!validatePhoneNumber(consentMobile)) {
      setError('consentMobile', {
        type: 'manual',
        message: 'Please enter a valid mobile number'
      });
      return;
    }
    setShowConsentOtp(true);
  };

  const handleVerifyConsentOtp = async () => {
    const consentOtp = watch('consentOtp');
    if (consentOtp === '123456') {
      setConsentVerified(true);
    } else {
      setError('consentOtp', {
        type: 'manual',
        message: 'Invalid OTP'
      });
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (!consentVerified) {
        setError('consentOtp', {
          type: 'manual',
          message: 'Please verify consent OTP before proceeding'
        });
        return;
      }

      // 1. Insert patient data
      const { data: patientData, error: patientError } = await supabase
        .from('pregnant_women')
        .insert({
          diagnostic_center_id: diagnosticCenter.id,
          name: data.name.trim(),
          age: data.age,
          husband_name: data.husbandName?.trim() || null,
          father_name: data.fatherName?.trim() || null,
          present_address: data.presentAddress.trim(),
          aadhar_card_address: data.aadharCardAddress?.trim() || null,
          contact_number: data.contactNumber
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // 2. Insert pregnancy details
      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from('pregnancy_details')
        .insert({
          pregnant_woman_id: patientData.id,
          last_menstrual_period: data.lastMenstrualPeriod,
          number_of_children_alive: data.numberOfChildrenAlive
        })
        .select()
        .single();

      if (pregnancyError) throw pregnancyError;

      // 3. Insert children if any
      if (data.children && data.children.length > 0) {
        const { error: childrenError } = await supabase
          .from('children')
          .insert(
            data.children.map(child => ({
              pregnancy_details_id: pregnancyData.id,
              gender: child.gender,
              age_in_years: child.ageInYears
            }))
          );

        if (childrenError) throw childrenError;
      }

      // 4. Insert procedure
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .insert({
          pregnant_woman_id: patientData.id,
          procedure_date: data.procedureDate,
          attending_doctor_id: data.performingDoctorId
        })
        .select()
        .single();

      if (procedureError) throw procedureError;

      // 5. Insert procedure indications
      if (data.selectedIndications.length > 0) {
        const { error: indicationsError } = await supabase
          .from('procedure_indications')
          .insert(
            data.selectedIndications.map(indicationId => ({
              procedure_id: procedureData.id,
              indication_type_id: indicationId
            }))
          );

        if (indicationsError) throw indicationsError;
      }

      // 6. Insert consent
      const { error: consentError } = await supabase
        .from('consent')
        .insert({
          pregnant_woman_id: patientData.id,
          mobile_number: data.consentMobile,
          otp_verified: true,
          verification_details: `Verified at ${new Date().toISOString()}`
        });

      if (consentError) throw consentError;

      // Navigate back to dashboard after successful registration
      navigate('/dashboard');
    } catch (err) {
      console.error('Error adding patient:', err);
      setError('root', {
        type: 'server',
        message: 'Failed to register patient. Please try again.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-black hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Patient</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {errors.root && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md">
                  {errors.root.message}
                </div>
              )}

              {/* Step navigation */}
              <div className="flex space-x-4 mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-4 py-2 rounded-md ${
                    step === 1 ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
                >
                  Basic Information
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-4 py-2 rounded-md ${
                    step === 2 ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
                >
                  Pregnancy Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`px-4 py-2 rounded-md ${
                    step === 3 ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
                >
                  Procedure Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`px-4 py-2 rounded-md ${
                    step === 4 ? 'bg-black text-white' : 'bg-gray-100'
                  }`}
                >
                  Consent
                </button>
              </div>

              {/* Basic Information - Step 1 */}
              {step === 1 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register('name', { 
                        required: 'Name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' }
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      {...register('age', { 
                        required: 'Age is required',
                        min: { value: 18, message: 'Age must be at least 18' },
                        max: { value: 65, message: 'Age must be less than 65' }
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.age && (
                      <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="husbandName" className="block text-sm font-medium text-gray-700">
                      Husband's Name
                    </label>
                    <input
                      type="text"
                      id="husbandName"
                      {...register('husbandName')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      id="fatherName"
                      {...register('fatherName')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="presentAddress" className="block text-sm font-medium text-gray-700">
                      Present Address
                    </label>
                    <textarea
                      id="presentAddress"
                      rows={3}
                      {...register('presentAddress', { 
                        required: 'Present address is required',
                        minLength: { value: 10, message: 'Address must be at least 10 characters' }
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.presentAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.presentAddress.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="aadharCardAddress" className="block text-sm font-medium text-gray-700">
                      Aadhar Card Address
                    </label>
                    <textarea
                      id="aadharCardAddress"
                      rows={3}
                      {...register('aadharCardAddress')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contactNumber"
                      {...register('contactNumber', { 
                        required: 'Contact number is required',
                        validate: validatePhoneNumber
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      maxLength={10}
                      pattern="[6-9][0-9]{9}"
                    />
                    {errors.contactNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactNumber.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Pregnancy Details - Step 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="lastMenstrualPeriod" className="block text-sm font-medium text-gray-700">
                      Last Menstrual Period (LMP)
                    </label>
                    <input
                      type="date"
                      id="lastMenstrualPeriod"
                      {...register('lastMenstrualPeriod', {
                        required: 'LMP is required',
                        validate: validateLMP
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.lastMenstrualPeriod && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastMenstrualPeriod.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="numberOfChildrenAlive" className="block text-sm font-medium text-gray-700">
                      Number of Children Alive
                    </label>
                    <input
                      type="number"
                      id="numberOfChildrenAlive"
                      min="0"
                      max="10"
                      {...register('numberOfChildrenAlive', {
                        required: 'This field is required',
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 10, message: 'Cannot be more than 10' }
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.numberOfChildrenAlive && (
                      <p className="mt-1 text-sm text-red-600">{errors.numberOfChildrenAlive.message}</p>
                    )}
                  </div>

                  {numberOfChildrenAlive > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
                        <button
                          type="button"
                          onClick={addChild}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Child
                        </button>
                      </div>

                      {watch('children')?.map((_, index) => (
                        <div key={index} className="p-4 border rounded-md space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-md font-medium">Child {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeChild(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Gender
                              </label>
                              <select
                                {...register(`children.${index}.gender`)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Age (Years)
                              </label>
                              <input
                                type="number"
                                {...register(`children.${index}.ageInYears`, {
                                  required: 'Age is required',
                                  min: { value: 0, message: 'Age cannot be negative' }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Procedure Details - Step 3 */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="procedureDate" className="block text-sm font-medium text-gray-700">
                      Procedure Date
                    </label>
                    <input
                      type="date"
                      id="procedureDate"
                      {...register('procedureDate', {
                        required: 'Procedure date is required'
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    {errors.procedureDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.procedureDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="performingDoctorId" className="block text-sm font-medium text-gray-700">
                      Performing Doctor
                    </label>
                    <select
                      id="performingDoctorId"
                      {...register('performingDoctorId', {
                        required: 'Please select a performing doctor'
                      })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select a doctor</option>
                      {performingDoctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.qualifications}
                        </option>
                      ))}
                    </select>
                    {errors.performingDoctorId && (
                      <p className="mt-1 text-sm text-red-600">{errors.performingDoctorId.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="referringDoctorId" className="block text-sm font-medium text-gray-700">
                      Referring Doctor
                    </label>
                    <select
                      id="referringDoctorId"
                      {...register('referringDoctorId')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select a referring doctor (optional)</option>
                      {referringDoctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.hospital_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Indications
                    </label>
                    <div className="space-y-2">
                      {indicationTypes.map(indication => (
                        <label key={indication.id} className="flex items-start">
                          <input
                            type="checkbox"
                            value={indication.id}
                            {...register('selectedIndications')}
                            className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span className="ml-2 text-sm text-gray-700">{indication.indication}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Consent - Step 4 */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Patient consent is required before proceeding with the procedure. 
                      Please verify the patient's mobile number through OTP verification.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="consentMobile" className="block text-sm font-medium text-gray-700">
                      Patient's Mobile Number for Consent
                    </label>
                    <div className="mt-1 flex space-x-4">
                      <input
                        type="tel"
                        id="consentMobile"
                        {...register('consentMobile', {
                          required: 'Mobile number is required for consent',
                          validate: validatePhoneNumber
                        })}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                        disabled={showConsentOtp}
                      />
                      {!showConsentOtp && (
                        <button
                          type="button"
                          onClick={handleSendConsentOtp}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          Send OTP
                        </button>
                      )}
                    </div>
                    {errors.consentMobile && (
                      <p className="mt-1 text-sm text-red-600">{errors.consentMobile.message}</p>
                    )}
                  </div>

                  {showConsentOtp && !consentVerified && (
                    <div>
                      <label htmlFor="consentOtp" className="block text-sm font-medium text-gray-700">
                        Enter OTP
                      </label>
                      <div className="mt-1 flex space-x-4">
                        <input
                          type="text"
                          id="consentOtp"
                          {...register('consentOtp', {
                            required: 'OTP is required',
                            minLength: { value: 6, message: 'OTP must be 6 digits' }
                          })}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyConsentOtp}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          Verify OTP
                        </button>
                      </div>
                      {errors.consentOtp && (
                        <p className="mt-1 text-sm text-red-600">{errors.consentOtp.message}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">Use 123456 as the OTP for testing</p>
                    </div>
                  )}

                  {consentVerified && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span>Consent verified successfully</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="bg-gray-100 text-gray-800 rounded-md py-2 px-4 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Previous
                  </button>
                )}
                
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!consentVerified}
                    className={`rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      consentVerified
                        ? 'bg-black text-white hover:bg-gray-800 focus:ring-black'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Submit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

                