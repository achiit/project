import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Check, XCircle, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  currentDiagnosticCenterId: string;
  onUpdate: () => void;
}

interface EditablePatientData {
  pregnancy_details: {
    id: string;
    number_of_children_alive: number;
    last_menstrual_period: string;
    gestation_period_weeks: number;
    gestation_period_days: number;
    children: {
      id: string;
      gender: string;
      age_in_years: number;
    }[];
  }[];
  procedures: {
    id: string;
    procedure_date: string;
    referring_doctor: {
      id: string;
      name: string;
      registration_number: string;
      hospital_address: string;
      hospital_name: string;
      contact_info: string;

    };
    performing_doctor: {
      id: string;
      name: string;
      registration_number: string;
      contact_info: string;
      qualifications: string;
    };
    scan: {
      id: string;
      name: string;
    };
    procedure_indications: {
      indication_type: {
        id: number;
        indication: string;
      };
    }[];
  }[];
}

interface RelativeDetails {
  name: string;
  relationship: string;
  contact_number: string;
}

const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patientId,
  currentDiagnosticCenterId,
  onUpdate
}) => {
  const [formData, setFormData] = useState<EditablePatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentOtp, setShowConsentOtp] = useState(false);
  const [consentVerified, setConsentVerified] = useState(false);
  const [aadharError, setAadharError] = useState<string | null>(null);
  const [performingDoctors, setPerformingDoctors] = useState<PerformingDoctor[]>([]);
  const [referringDoctors, setReferringDoctors] = useState<ReferringDoctor[]>([]);
  const [indicationTypes, setIndicationTypes] = useState<IndicationType[]>([]);
  const [scans, setScans] = useState([]);
  const [relativeDetails, setRelativeDetails] = useState<RelativeDetails>({
    name: '',
    relationship: '',
    contact_number: ''
  });

  // Add this state for relationship options
  const relationshipOptions = [
    "Husband",
    "Father",
    "Mother",
    "Brother",
    "Sister",
    "Mother in law",
    "Father in law",
    "Brother in law",
    "Sister in law",
    "Other"
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPatientData();
      checkOrCreateAssociation();
      fetchDoctors();
      fetchIndicationTypes();
      fetchScans();
    }
  }, [isOpen, patientId]);

  const checkOrCreateAssociation = async () => {
    try {
      // Check if association exists
      const { data: existingAssociation } = await supabase
        .from('patient_center_associations')
        .select('*')
        .eq('patient_id', patientId)
        .eq('diagnostic_center_id', currentDiagnosticCenterId);

      // If no association exists, create one
      if (!existingAssociation?.length) {
        const { error } = await supabase
          .from('patient_center_associations')
          .insert([{
            patient_id: patientId,
            diagnostic_center_id: currentDiagnosticCenterId
          }]);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error managing association:', err);
    }
  };

  const fetchPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('pregnant_women')
        .select(`
          pregnancy_details (
            id,
            number_of_children_alive,
            last_menstrual_period,
            children (
              id,
              gender,
              age_in_years
            )
          ),
          procedures (
            id,
            procedure_date,
            scan_performed,
            attending_doctor_id,
            referring_doctor_id,
            referring_doctor:referring_doctors!referring_doctor_id (
              id,
              name,
              hospital_name,
              registration_number,
              contact_info
            ),
            performing_doctor:performing_doctors!attending_doctor_id (
              id,
              name,
              qualifications,
              registration_number,
              contact_info
            ),
            procedure_indications (
              indication_type:indication_types (
                id,
                indication
              )
            )
          )
        `)
        .eq('id', patientId)
        .maybeSingle();

      if (error) throw error;

      // Transform the data to match our form structure
      if (data) {
        const transformedData = {
          ...data,
          procedures: data.procedures.map(proc => ({
            ...proc,
            performing_doctor: proc.performing_doctor || { id: proc.attending_doctor_id },
            referring_doctor: proc.referring_doctor || { id: proc.referring_doctor_id }
          }))
        };
        setFormData(transformedData);
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data: performingData, error: performingError } = await supabase
        .from("performing_doctors")
        .select("id, name, qualifications")
        .eq("diagnostic_center_id", currentDiagnosticCenterId);

      if (performingError) throw performingError;
      setPerformingDoctors(performingData || []);

      const { data: referringData, error: referringError } = await supabase
        .from("referring_doctors")
        .select("id, name, hospital_name")
        .eq("diagnostic_center_id", currentDiagnosticCenterId);

      if (referringError) throw referringError;
      setReferringDoctors(referringData || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchIndicationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("indication_types")
        .select("*")
        .order("id");

      if (error) throw error;
      setIndicationTypes(data || []);
    } catch (err) {
      console.error("Error fetching indication types:", err);
    }
  };

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("name");

      if (error) throw error;
      setScans(data || []);
    } catch (err) {
      console.error("Error fetching scans:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Update pregnancy details and children
      for (const pd of formData.pregnancy_details) {
        // Update pregnancy details
        const { error: pdError } = await supabase
          .from('pregnancy_details')
          .update({
            number_of_children_alive: pd.number_of_children_alive,
            last_menstrual_period: pd.last_menstrual_period
          })
          .eq('id', pd.id);

        if (pdError) throw pdError;

        // Handle children updates and additions
        if (pd.children) {
          for (const child of pd.children) {
            if (child.id.startsWith('temp-')) {
              // New child to be added
              const { error: newChildError } = await supabase
                .from('children')
                .insert({
                  pregnancy_details_id: pd.id,
                  gender: child.gender,
                  age_in_years: child.age_in_years
                });
              if (newChildError) throw newChildError;
            } else {
              // Update existing child
              const { error: childError } = await supabase
                .from('children')
                .update({
                  gender: child.gender,
                  age_in_years: child.age_in_years
                })
                .eq('id', child.id);
              if (childError) throw childError;
            }
          }
        }
      }

      // Update procedures
      for (const proc of formData.procedures) {
        // Update procedure
        const { error: procError } = await supabase
          .from('procedures')
          .update({
            procedure_date: proc.procedure_date,
            attending_doctor_id: proc.performing_doctor?.id || proc.attending_doctor_id,
            referring_doctor_id: proc.referring_doctor?.id || proc.referring_doctor_id,
            scan_performed: proc.scan_performed
          })
          .eq('id', proc.id);

        if (procError) throw procError;

        // Update procedure indications
        if (proc.procedure_indications) {
          // First, delete existing indications
          const { error: deleteError } = await supabase
            .from('procedure_indications')
            .delete()
            .eq('procedure_id', proc.id);

          if (deleteError) throw deleteError;

          // Then insert new ones
          if (proc.procedure_indications.length > 0) {
            const { error: indicationsError } = await supabase
              .from('procedure_indications')
              .insert(
                proc.procedure_indications.map(pi => ({
                  procedure_id: proc.id,
                  indication_type_id: pi.indication_type.id
                }))
              );

            if (indicationsError) throw indicationsError;
          }
        }
      }

      // Update consent information
      const { error: consentError } = await supabase
        .from('consent')
        .update({
          has_aadhar_registered_mobile: formData.has_aadhar_registered_mobile,
          mobile_number: formData.mobile_number,
          relative_name: !formData.has_aadhar_registered_mobile ? relativeDetails.name : null,
          relationship_to_patient: !formData.has_aadhar_registered_mobile ? relativeDetails.relationship : null,
          relative_contact_number: !formData.has_aadhar_registered_mobile ? relativeDetails.contact_number : null
        })
        .eq('pregnant_woman_id', patientId);

      if (consentError) throw consentError;

      onUpdate();
      onClose();
      toast.success('Patient details updated successfully');
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
      toast.error('Failed to update patient details');
    } finally {
      setSaving(false);
    }
  };

  const handleSendConsentOtp = async () => {
    // Implement OTP sending logic
    setShowConsentOtp(true);
  };

  const handleVerifyConsentOtp = async () => {
    // Implement OTP verification logic
    setConsentVerified(true);
  };

  const handleAddChild = (pregnancyDetailsIndex: number) => {
    const newFormData = { ...formData };
    if (!newFormData.pregnancy_details[pregnancyDetailsIndex].children) {
      newFormData.pregnancy_details[pregnancyDetailsIndex].children = [];
    }
    newFormData.pregnancy_details[pregnancyDetailsIndex].children.push({
      id: `temp-${Date.now()}`,
      gender: 'Male',
      age_in_years: 0
    });
    setFormData(newFormData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Patient Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#774C60] border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Pregnancy Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Pregnancy Details</h3>
              {formData?.pregnancy_details?.map((pd, index) => (
                <div key={pd.id} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Menstrual Period</label>
                      <input
                        type="date"
                        value={pd.last_menstrual_period}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          newFormData.pregnancy_details[index].last_menstrual_period = e.target.value;
                          setFormData(newFormData);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Number of Children Alive</label>
                      <input
                        type="number"
                        value={pd.number_of_children_alive}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          newFormData.pregnancy_details[index].number_of_children_alive = parseInt(e.target.value);
                          setFormData(newFormData);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                      />
                    </div>
                  </div>

                  {/* Children Details */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-medium text-gray-700">Children</h4>
                      <button
                        type="button"
                        onClick={() => handleAddChild(index)}
                        className="inline-flex items-center text-sm text-[#774C60] hover:text-[#B75D69]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Child
                      </button>
                    </div>
                    {pd.children?.map((child, childIndex) => (
                      <div key={child.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded border">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Gender</label>
                          <select
                            value={child.gender}
                            onChange={(e) => {
                              const newFormData = { ...formData };
                              newFormData.pregnancy_details[index].children[childIndex].gender = e.target.value;
                              setFormData(newFormData);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Age (Years)</label>
                          <input
                            type="number"
                            value={child.age_in_years}
                            onChange={(e) => {
                              const newFormData = { ...formData };
                              newFormData.pregnancy_details[index].children[childIndex].age_in_years = parseInt(e.target.value);
                              setFormData(newFormData);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Procedures Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Procedures</h3>
              {formData?.procedures?.map((proc, index) => (
                <div key={proc.id} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Procedure Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Procedure Date</label>
                      <input
                        type="date"
                        value={proc.procedure_date}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          newFormData.procedures[index].procedure_date = e.target.value;
                          setFormData(newFormData);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Scan Type</label>
                      <select
                        value={proc.scan_performed}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          const selectedScanId = e.target.value;
                          newFormData.procedures[index].scan_performed = selectedScanId;
                          setFormData(newFormData);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                      >
                        {scans.map(scan => (
                          <option key={scan.id} value={scan.id}>
                            {scan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Performing Doctor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Performing Doctor</label>
                    <select
                      value={proc.performing_doctor?.id || proc.attending_doctor_id}
                      onChange={(e) => {
                        const newFormData = { ...formData };
                        const selectedDoctor = performingDoctors.find(d => d.id === e.target.value);
                        newFormData.procedures[index].attending_doctor_id = e.target.value;
                        newFormData.procedures[index].performing_doctor = selectedDoctor;
                        setFormData(newFormData);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                    >
                      <option value="">Select Performing Doctor</option>
                      {performingDoctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} {doctor.qualifications ? `- ${doctor.qualifications}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Referring Doctor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Referring Doctor</label>
                    <select
                      value={proc.referring_doctor?.id || proc.referring_doctor_id}
                      onChange={(e) => {
                        const newFormData = { ...formData };
                        const selectedDoctor = referringDoctors.find(d => d.id === e.target.value);
                        newFormData.procedures[index].referring_doctor_id = e.target.value;
                        newFormData.procedures[index].referring_doctor = selectedDoctor;
                        setFormData(newFormData);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#774C60] focus:ring-[#774C60]"
                    >
                      <option value="">Select Referring Doctor</option>
                      {referringDoctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} {doctor.hospital_name ? `- ${doctor.hospital_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Indications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Indications</label>
                    <div className="mt-2 space-y-2">
                      {indicationTypes.map(indication => (
                        <label key={indication.id} className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={proc.procedure_indications?.some(
                              pi => pi.indication_type.id === indication.id
                            )}
                            onChange={(e) => {
                              const newFormData = { ...formData };
                              if (e.target.checked) {
                                if (!newFormData.procedures[index].procedure_indications) {
                                  newFormData.procedures[index].procedure_indications = [];
                                }
                                newFormData.procedures[index].procedure_indications.push({
                                  indication_type: indication
                                });
                              } else {
                                newFormData.procedures[index].procedure_indications = 
                                  newFormData.procedures[index].procedure_indications?.filter(
                                    pi => pi.indication_type.id !== indication.id
                                  );
                              }
                              setFormData(newFormData);
                            }}
                            className="rounded border-gray-300 text-[#774C60] focus:ring-[#774C60]"
                          />
                          <span className="ml-2 text-sm text-gray-700">{indication.indication}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Consent Section */}
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Patient Consent
                    </h2>

                    {/* Question: Does the patient have an Aadhar registered mobile number? */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-[#774C60] mb-2">
                        Does patient have Aadhar registered mobile number? *
                      </label>
                      <select
                        value={formData.has_aadhar_registered_mobile ? "true" : "false"}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          newFormData.has_aadhar_registered_mobile = e.target.value === "true";
                          setFormData(newFormData);
                        }}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      >
                        <option value="">Select an option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>

                    {/* Conditional Rendering Based on Selection */}
                    {formData.has_aadhar_registered_mobile !== undefined && (
                      <div className="space-y-6">
                        {/* If patient does NOT have an Aadhar registered mobile number */}
                        {!formData.has_aadhar_registered_mobile && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-[#774C60] mb-2">
                                Name of Relative *
                              </label>
                              <input
                                type="text"
                                value={relativeDetails.name}
                                onChange={(e) => setRelativeDetails({...relativeDetails, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                                placeholder="Enter relative's name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#774C60] mb-2">
                                Relationship to Patient *
                              </label>
                              <select
                                value={relativeDetails.relationship}
                                onChange={(e) => setRelativeDetails({...relativeDetails, relationship: e.target.value})}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                              >
                                <option value="">Select relationship</option>
                                {relationshipOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {/* Mobile Number and OTP Section */}
                        <div>
                          <label className="block text-sm font-medium text-[#774C60] mb-2">
                            {formData.has_aadhar_registered_mobile
                              ? "Aadhar Registered Mobile Number *"
                              : "Relative's Mobile Number *"}
                          </label>
                          <div className="flex space-x-4">
                            <input
                              type="tel"
                              value={formData.mobile_number || ''}
                              onChange={(e) => {
                                const newFormData = { ...formData };
                                newFormData.mobile_number = e.target.value;
                                setFormData(newFormData);
                              }}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                              maxLength={10}
                              disabled={showConsentOtp}
                              placeholder="Enter 10-digit mobile number"
                            />
                            {!showConsentOtp && (
                              <button
                                type="button"
                                onClick={handleSendConsentOtp}
                                className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69]"
                              >
                                Send OTP
                              </button>
                            )}
                          </div>
                        </div>

                        {/* OTP Verification Section */}
                        {showConsentOtp && !consentVerified && (
                          <div>
                            <label className="block text-sm font-medium text-[#774C60] mb-2">
                              Enter OTP
                            </label>
                            <div className="flex space-x-4">
                              <input
                                type="text"
                                maxLength={6}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                                placeholder="Enter 6-digit OTP"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyConsentOtp}
                                className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69]"
                              >
                                Verify OTP
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Success Message */}
                        {consentVerified && (
                          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                            <Check className="h-5 w-5" />
                            <span>Mobile number verified successfully</span>
                          </div>
                        )}

                        {aadharError && (
                          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                            <XCircle className="h-5 w-5" />
                            <span>{aadharError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69] disabled:bg-gray-400"
                disabled={saving || !consentVerified}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditPatientModal; 