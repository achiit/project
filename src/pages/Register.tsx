import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormErrors {
  phoneNumber?: string;
  name?: string;
  plotFloorStreet?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  registrationNumber?: string;
  performingDoctors?: string;
  referringDoctors?: string;
}

interface PerformingDoctor {
  name: string;
  qualifications: string;
  registrationNumber: string;
  contactInfo: string;
}

interface ReferringDoctor {
  name: string;
  hospitalName: string;
  hospitalAddress: string;
  registrationNumber: string;
  contactInfo: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: '',
    name: '',
    plotFloorStreet: '',
    city: '',
    district: '',
    state: '',
    pin: '',
    registrationNumber: ''
  });
  const [performingDoctors, setPerformingDoctors] = useState<PerformingDoctor[]>([]);
  const [referringDoctors, setReferringDoctors] = useState<ReferringDoctor[]>([]);

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePin = (pin: string) => {
    const pinRegex = /^\d{6}$/;
    return pinRegex.test(pin);
  };

  const validateRegistrationNumber = (regNo: string) => {
    return regNo.length >= 5 && regNo.length <= 50;
  };

  const validateDoctors = () => {
    if (performingDoctors.length === 0) {
      setFormErrors(prev => ({
        ...prev,
        performingDoctors: 'At least one performing doctor is required'
      }));
      return false;
    }

    for (const doctor of performingDoctors) {
      if (!doctor.name || !doctor.qualifications || !doctor.registrationNumber || !doctor.contactInfo) {
        setFormErrors(prev => ({
          ...prev,
          performingDoctors: 'All performing doctor fields are required'
        }));
        return false;
      }
    }

    return true;
  };

  const validateForm = () => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Center name is required';
      isValid = false;
    }

    if (!formData.plotFloorStreet.trim()) {
      errors.plotFloorStreet = 'Address is required';
      isValid = false;
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
      isValid = false;
    }

    if (!formData.district.trim()) {
      errors.district = 'District is required';
      isValid = false;
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
      isValid = false;
    }

    if (!validatePin(formData.pin)) {
      errors.pin = 'Please enter a valid 6-digit PIN code';
      isValid = false;
    }

    if (!validateRegistrationNumber(formData.registrationNumber)) {
      errors.registrationNumber = 'Please enter a valid registration number (5-50 characters)';
      isValid = false;
    }

    if (!validateDoctors()) {
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormErrors({});

    if (!validatePhoneNumber(formData.phoneNumber)) {
      setFormErrors({
        phoneNumber: 'Please enter a valid 10-digit mobile number starting with 6-9'
      });
      return;
    }

    setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (formData.otp === '123456') {
      setStep(3);
    } else {
      setError('Invalid OTP');
    }
  };

  const addPerformingDoctor = () => {
    setPerformingDoctors([
      ...performingDoctors,
      { name: '', qualifications: '', registrationNumber: '', contactInfo: '' }
    ]);
  };

  const removePerformingDoctor = (index: number) => {
    setPerformingDoctors(performingDoctors.filter((_, i) => i !== index));
  };

  const updatePerformingDoctor = (index: number, field: keyof PerformingDoctor, value: string) => {
    const updatedDoctors = [...performingDoctors];
    updatedDoctors[index] = { ...updatedDoctors[index], [field]: value };
    setPerformingDoctors(updatedDoctors);
  };

  const addReferringDoctor = () => {
    setReferringDoctors([
      ...referringDoctors,
      { name: '', hospitalName: '', hospitalAddress: '', registrationNumber: '', contactInfo: '' }
    ]);
  };

  const removeReferringDoctor = (index: number) => {
    setReferringDoctors(referringDoctors.filter((_, i) => i !== index));
  };

  const updateReferringDoctor = (index: number, field: keyof ReferringDoctor, value: string) => {
    const updatedDoctors = [...referringDoctors];
    updatedDoctors[index] = { ...updatedDoctors[index], [field]: value };
    setReferringDoctors(updatedDoctors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${formData.phoneNumber}@example.com`,
        password: formData.phoneNumber,
        phone: formData.phoneNumber
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('No user data returned');

      // 2. Create diagnostic center record
      const { data: centerData, error: centerError } = await supabase
        .from('diagnostic_centers')
        .insert({
          id: authData.user.id,
          name: formData.name.trim(),
          plot_floor_street: formData.plotFloorStreet.trim(),
          city: formData.city.trim(),
          district: formData.district.trim(),
          state: formData.state.trim(),
          pin: parseInt(formData.pin),
          phone_number: formData.phoneNumber,
          registration_number: formData.registrationNumber.trim()
        })
        .select()
        .single();

      if (centerError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw centerError;
      }

      // 3. Insert performing doctors
      if (performingDoctors.length > 0) {
        const { error: performingDoctorsError } = await supabase
          .from('performing_doctors')
          .insert(
            performingDoctors.map(doctor => ({
              diagnostic_center_id: authData.user.id,
              ...doctor
            }))
          );

        if (performingDoctorsError) throw performingDoctorsError;
      }

      // 4. Insert referring doctors
      if (referringDoctors.length > 0) {
        const { error: referringDoctorsError } = await supabase
          .from('referring_doctors')
          .insert(
            referringDoctors.map(doctor => ({
              diagnostic_center_id: authData.user.id,
              ...doctor
            }))
          );

        if (referringDoctorsError) throw referringDoctorsError;
      }

      // 5. Log in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${formData.phoneNumber}@example.com`,
        password: formData.phoneNumber,
      });

      if (signInError) throw signInError;

      login({
        id: authData.user.id,
        name: formData.name,
        phoneNumber: formData.phoneNumber
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to register. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-4xl w-full px-6 py-8">
        <div className="text-center mb-8">
          <Building2 className="mx-auto h-12 w-12 text-black" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Register your Diagnostic Center
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
              />
              {formErrors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phoneNumber}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Enter OTP
              </label>
              <input
                type="text"
                id="otp"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
                maxLength={6}
                pattern="\d{6}"
              />
              <p className="mt-2 text-sm text-gray-500">Use 123456 as the OTP for testing</p>
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Verify OTP
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Center Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Center Details</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Center Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.registrationNumber && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.registrationNumber}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="plotFloorStreet" className="block text-sm font-medium text-gray-700">
                    Plot/Floor/Street
                  </label>
                  <input
                    type="text"
                    id="plotFloorStreet"
                    value={formData.plotFloorStreet}
                    onChange={(e) => setFormData({ ...formData, plotFloorStreet: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.plotFloorStreet && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.plotFloorStreet}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                    District
                  </label>
                  <input
                    type="text"
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.district && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.district}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  />
                  {formErrors.state && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.state}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                  />
                  {formErrors.pin && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.pin}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Performing Doctors */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Performing Doctors</h3>
                <button
                  type="button"
                  onClick={addPerformingDoctor}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Doctor
                </button>
              </div>
              {formErrors.performingDoctors && (
                <p className="mt-1 text-sm text-red-600 mb-4">{formErrors.performingDoctors}</p>
              )}
              <div className="space-y-4">
                {performingDoctors.map((doctor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium">Doctor {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removePerformingDoctor(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={doctor.name}
                          onChange={(e) => updatePerformingDoctor(index, 'name', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Qualifications</label>
                        <input
                          type="text"
                          value={doctor.qualifications}
                          onChange={(e) => updatePerformingDoctor(index, 'qualifications', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                        <input
                          type="text"
                          value={doctor.registrationNumber}
                          onChange={(e) => updatePerformingDoctor(index, 'registrationNumber', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Info</label>
                        <input
                          type="tel"
                          value={doctor.contactInfo}
                          onChange={(e) => updatePerformingDoctor(index, 'contactInfo', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Referring Doctors */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Referring Doctors</h3>
                <button
                  type="button"
                  onClick={addReferringDoctor}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Referring Doctor
                </button>
              </div>
              <div className="space-y-4">
                {referringDoctors.map((doctor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium">Referring Doctor {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeReferringDoctor(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={doctor.name}
                          onChange={(e) => updateReferringDoctor(index, 'name', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Hospital Name</label>
                        <input
                          type="text"
                          value={doctor.hospitalName}
                          onChange={(e) => updateReferringDoctor(index, 'hospitalName', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Hospital Address</label>
                        <textarea
                          value={doctor.hospitalAddress}
                          onChange={(e) => updateReferringDoctor(index, 'hospitalAddress', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                        <input
                          type="text"
                          value={doctor.registrationNumber}
                          onChange={(e) => updateReferringDoctor(index, 'registrationNumber', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Info</label>
                        <input
                          type="tel"
                          value={doctor.contactInfo}
                          onChange={(e) => updateReferringDoctor(index, 'contactInfo', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Register Center
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/" className="font-medium text-black hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}