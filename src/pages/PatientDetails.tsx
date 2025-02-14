import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit3 } from 'lucide-react';
import Header from '../components/Header';
import EditPatientModal from '../components/EditPatientModal';
import PrintableForm from '../components/PrintableForm';

// A small reusable card component for grouping fields
interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}
const InfoCard: React.FC<InfoCardProps> = ({ title, children }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-bold text-gray-700 mb-2">{title}</h2>
      {children}
    </div>
  );
};

interface ChildData {
  id: string;
  gender: string;
  age_in_years: number;
}

interface PregnancyDetail {
  id: string;
  number_of_children_alive: number;
  last_menstrual_period: string;
  children?: ChildData[];
}

interface IndicationType {
  id: number;
  indication: string;
}

interface ProcedureIndication {
  indication_type: IndicationType;
}

interface Procedure {
  id: string;
  procedure_date: string;
  referring_doctor: {
    id: string;
    name: string;
    registration_number: string;
    hospital_address: string;
    hospital_name: string;
    contact_info: string;
    qualifications: string;
  } | null;
  performing_doctor: {
    id: string;
    name: string;
    registration_number: string;
    contact_info: string;
    qualifications: string;
  } | null;
  scan: {
    id: string;
    name: string;
  } | null;
  procedure_indications: ProcedureIndication[];
}

interface Consent {
  id: string;
  mobile_number: string;
  otp_verified: boolean;
  verification_details: string;
  has_aadhar_registered_mobile: boolean;
  relative_name: string | null;
  relationship_to_patient: string | null;
  relative_contact_number: string | null;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  husband_name: string;
  father_name: string;
  present_address: string;
  aadhar_card_address: string;
  aadhar_number: string;
  contact_number: string;
  created_at: string;
  pregnancy_details?: PregnancyDetail[];
  procedures?: Procedure[];
  consent?: Consent[];
}

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { diagnosticCenter } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode controls only fields from 'pregnant_women' in this example
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});

  // State for showing the edit modal
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch patient details
  const fetchPatientDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('pregnant_women')
        .select(
          `
            id,
            name,
            age,
            husband_name,
            father_name,
            present_address,
            aadhar_card_address,
            aadhar_number,
            contact_number,
            created_at,

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
              referring_doctor:referring_doctors (
                id,
                name,
                registration_number,
                hospital_address,
                hospital_name,
                contact_info
              ),
              performing_doctor:performing_doctors (
                id,
                name,
                registration_number,
                contact_info,
                qualifications
              ),
              scan:scans (
                id,
                name
              ),
              procedure_indications (
                indication_type:indication_types (
                  id,
                  indication
                )
              )
            ),

            consent (
              id,
              mobile_number,
              otp_verified,
              verification_details,
              has_aadhar_registered_mobile,
              relative_name,
              relationship_to_patient,
              relative_contact_number
            )
          `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      setPatient(data);
      setFormData(data); // prefill formData with the fetched data
    } catch (err) {
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  // Basic input handler for patient fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save changes (only fields in 'pregnant_women' table)
  const handleSave = async () => {
    try {
      const updatePayload = {
        name: formData.name,
        age: formData.age,
        husband_name: formData.husband_name,
        father_name: formData.father_name,
        present_address: formData.present_address,
        aadhar_card_address: formData.aadhar_card_address,
        aadhar_number: formData.aadhar_number,
        contact_number: formData.contact_number
      };

      const { error } = await supabase
        .from('pregnant_women')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      // Reflect changes in local state
      setPatient((prev) => (prev ? { ...prev, ...updatePayload } : null));
      setEditMode(false);
    } catch (err) {
      console.error('Error saving patient details:', err);
    }
  };

  const handleCancel = () => {
    // Revert changes
    setFormData(patient || {});
    setEditMode(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FFF4E8]">
      <Header />

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-[#774C60] hover:text-[#B75D69] border border-[#774C60] rounded-lg px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#774C60] border-t-transparent"></div>
          </div>
        ) : !patient ? (
          <div className="text-center mt-8">
            <h2 className="text-xl font-bold text-gray-700">Patient not found</h2>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* Patient Header Card */}
            <div className="bg-[#774C60] p-6 rounded-lg shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  {editMode ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="text-3xl font-bold mb-2 bg-[#6b4353] text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#b75d69]"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold mb-2">{patient.name}</h1>
                  )}

                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    {/* Age */}
                    <div>
                      <span className="opacity-75">Age:</span>{' '}
                      {editMode ? (
                        <input
                          type="number"
                          name="age"
                          value={formData.age || ''}
                          onChange={handleInputChange}
                          className="bg-[#6b4353] text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#b75d69]"
                        />
                      ) : (
                        `${patient.age} years`
                      )}
                    </div>

                    {/* Contact */}
                    <div>
                      <span className="opacity-75">Contact:</span>{' '}
                      {editMode ? (
                        <input
                          type="tel"
                          name="contact_number"
                          value={formData.contact_number || ''}
                          onChange={handleInputChange}
                          className="bg-[#6b4353] text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#b75d69]"
                        />
                      ) : (
                        patient.contact_number
                      )}
                    </div>

                    {/* Aadhar */}
                    <div>
                      <span className="opacity-75">Aadhar:</span>{' '}
                      {editMode ? (
                        <input
                          type="text"
                          name="aadhar_number"
                          value={formData.aadhar_number || ''}
                          onChange={handleInputChange}
                          className="bg-[#6b4353] text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#b75d69]"
                        />
                      ) : (
                        patient.aadhar_number
                      )}
                    </div>

                
                  </div>
                </div>

                {/* Toggle Edit Mode */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <Edit3 className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                <InfoCard title="Personal Information">
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">Father's Name:</span>{' '}
                      {editMode ? (
                        <input
                          type="text"
                          name="father_name"
                          value={formData.father_name || ''}
                          onChange={handleInputChange}
                          className="border border-gray-300 rounded px-2 py-1 mt-1 w-full"
                        />
                      ) : (
                        patient.father_name
                      )}
                    </p>
                    <p>
                      <span className="font-semibold">Husband's Name:</span>{' '}
                      {editMode ? (
                        <input
                          type="text"
                          name="husband_name"
                          value={formData.husband_name || ''}
                          onChange={handleInputChange}
                          className="border border-gray-300 rounded px-2 py-1 mt-1 w-full"
                        />
                      ) : (
                        patient.husband_name
                      )}
                    </p>
                    <p>
                      <span className="font-semibold">Present Address:</span>
                      <br />
                      {editMode ? (
                        <input
                          type="text"
                          name="present_address"
                          value={formData.present_address || ''}
                          onChange={handleInputChange}
                          className="border border-gray-300 rounded px-2 py-1 mt-1 w-full"
                        />
                      ) : (
                        patient.present_address
                      )}
                    </p>
                    <p>
                      <span className="font-semibold">Aadhar Address:</span>
                      <br />
                      {editMode ? (
                        <input
                          type="text"
                          name="aadhar_card_address"
                          value={formData.aadhar_card_address || ''}
                          onChange={handleInputChange}
                          className="border border-gray-300 rounded px-2 py-1 mt-1 w-full"
                        />
                      ) : (
                        patient.aadhar_card_address
                      )}
                    </p>
                  </div>
                </InfoCard>

                <InfoCard title="Consent Information">
                  {patient.consent && patient.consent.length > 0 ? (
                    patient.consent.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded p-2 text-sm mb-4">
                        <p>
                          <span className="font-semibold">Has Aadhar Mobile?:</span>{' '}
                          {c.has_aadhar_registered_mobile ? 'Yes' : 'No'}
                        </p>
                        <p>
                          <span className="font-semibold">Mobile Number:</span>{' '}
                          {c.mobile_number}
                        </p>
                        <p>
                          <span className="font-semibold">OTP Verified?:</span>{' '}
                          {c.otp_verified ? 'Yes' : 'No'}
                        </p>
                        <p>
                          <span className="font-semibold">Verification Details:</span>{' '}
                          {c.verification_details || 'N/A'}
                        </p>
                        {c.has_aadhar_registered_mobile === false && (
                          <>
                            <p>
                              <span className="font-semibold">Relative Name:</span>{' '}
                              {c.relative_name}
                            </p>
                            <p>
                              <span className="font-semibold">Relationship:</span>{' '}
                              {c.relationship_to_patient}
                            </p>
                            <p>
                              <span className="font-semibold">Relative Contact:</span>{' '}
                              {c.relative_contact_number}
                            </p>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No consent information found.</p>
                  )}
                </InfoCard>
              </div>

              {/* MIDDLE COLUMN */}
              <div className="space-y-6">
                <InfoCard title="Pregnancy Details">
                  {patient.pregnancy_details && patient.pregnancy_details.length > 0 ? (
                    <div className="space-y-4 text-sm text-gray-700">
                      {patient.pregnancy_details.map((pd) => (
                        <div key={pd.id} className="bg-gray-50 rounded p-2">
                          <p>
                            <span className="font-semibold">LMP:</span>{' '}
                            {pd.last_menstrual_period || 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold">Children Alive:</span>{' '}
                            {pd.number_of_children_alive}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No pregnancy details found.</p>
                  )}
                </InfoCard>

                <InfoCard title="Children Details">
                  {patient.pregnancy_details &&
                  patient.pregnancy_details.length > 0 &&
                  patient.pregnancy_details[0].children &&
                  patient.pregnancy_details[0].children.length > 0 ? (
                    <ul className="space-y-2">
                      {patient.pregnancy_details[0].children.map((child) => (
                        <li key={child.id} className="bg-gray-50 rounded p-2 text-sm">
                          <span className="font-semibold">Gender:</span> {child.gender}
                          <br />
                          <span className="font-semibold">Age (years):</span> {child.age_in_years}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No children details available.</p>
                  )}
                </InfoCard>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                <InfoCard title="Procedures">
                  {patient.procedures && patient.procedures.length > 0 ? (
                    <div className="space-y-4">
                      {patient.procedures.map((proc) => (
                        <div key={proc.id} className="bg-gray-50 rounded p-2 text-sm">
                          <p>
                            <span className="font-semibold">Procedure Date:</span>{' '}
                            {proc.procedure_date}
                          </p>
                          <p>
                            <span className="font-semibold">Performing Doctor:</span>{' '}
                            {proc.performing_doctor ? proc.performing_doctor.name : 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold">Referring Doctor:</span>{' '}
                            {proc.referring_doctor ? proc.referring_doctor.name : 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold">Scan:</span>{' '}
                            {proc.scan ? proc.scan.name : 'N/A'}
                          </p>
                          {proc.procedure_indications && proc.procedure_indications.length > 0 && (
                            <div className="mt-1">
                              <span className="font-semibold">Indications:</span>
                              <ul className="list-disc list-inside">
                                {proc.procedure_indications.map((pi, idx) => (
                                  <li key={idx}>{pi.indication_type.indication}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No procedures found.</p>
                  )}
                </InfoCard>

              </div>
            </div>

            {editMode && (
              <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <EditPatientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        patientId={id!}
        currentDiagnosticCenterId={diagnosticCenter.id}
        onUpdate={fetchPatientDetails}
      />

      <button
        onClick={handlePrint}
        className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69] print:hidden"
      >
        Print Form F
      </button>

      {/* Only render PrintableForm when patient data is available */}
      {patient && (
        <PrintableForm patient={patient} onPrint={handlePrint} />
      )}
    </div>
  );
};

export default PatientDetails;
