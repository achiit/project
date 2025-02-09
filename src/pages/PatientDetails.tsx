import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageCircle, Phone, MapPin, Calendar, User, FileText, Check } from 'lucide-react';
import Header from '../components/Header';

interface Patient {
    id: string;
    name: string;
    age: integer;
    husband_name: string;
    father_name: string;
    present_address: string;
    aadhar_card_address: string;
    contact_number: string;
    created_at: string;
    pregnancy_details?: {
        id: string;
        number_of_children_alive: number;
        last_menstrual_period: string;
        children?: {
            id: string;
            gender: string;
            age_in_years: number;
        }[];
    }[];
    procedures?: {
        id: string;
        procedure_date: string;
        attending_doctor: {
            id: string;
            name: string;
            qualifications: string;
        };
        procedure_indications: {
            indication_type: {
                id: number;
                indication: string;
            };
        }[];
    }[];
    consent?: {
        id: string;
        mobile_number: string;
        otp_verified: boolean;
        verification_details: string;
    }[];
}

const PatientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { diagnosticCenter } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatientDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('pregnant_women')
                    .select(`
            *,
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
              attending_doctor:performing_doctors (
                id,
                name,
                qualifications
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
              verification_details
            )
          `)
                    .eq('id', id)
                    .eq('diagnostic_center_id', diagnosticCenter.id)
                    .single();

                if (error) throw error;
                setPatient(data);
            } catch (err) {
                console.error('Error fetching patient details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatientDetails();
    }, [id, diagnosticCenter.id]);

    return (
        <div className="min-h-screen bg-[#FFF4E8]">
            <Header />

            <div className="px-4 sm:px-6 lg:px-8 py-8">
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
                    <div className="mt-4">
                        <div className="bg-[#774C60] p-6 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div className="">
                                    <h1 className="text-3xl font-bold text-white mb-2">{patient.name}</h1>
                                    <div className="flex items-center text-white/90">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        <span>{patient.present_address}</span>
                                    </div>
                                </div>
                             
                            </div>
                        </div>

                        <div className="mt-8">
                            {/* Profile Header Section */}
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="lg:w-1/3 space-y-8">
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                            Contact Information
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center text-gray-700">
                                                <Phone className="w-5 h-5 mr-3 text-[#774C60]" />
                                                {patient.contact_number}
                                            </div>
                                            <div className="flex items-center text-gray-700">
                                                <MapPin className="w-5 h-5 mr-3 text-[#774C60]" />
                                                {patient.aadhar_card_address || patient.present_address}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                            Basic Information
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-gray-700">
                                                <span className="font-semibold">Age</span>
                                                <span>{patient.age} years</span>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <span className="font-semibold">Husband's Name</span>
                                                <span>{patient.husband_name || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <span className="font-semibold">Father's Name</span>
                                                <span>{patient.father_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {patient.consent?.[0] && (
                                        <div className="bg-white rounded-xl p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                                Consent Status
                                            </h3>
                                            <div className="flex items-center text-gray-700">
                                                {patient.consent[0].otp_verified ? (
                                                    <Check className="w-5 h-5 mr-3 text-green-500" />
                                                ) : (
                                                    <div className="w-5 h-5 mr-3 rounded-full bg-red-500" />
                                                )}
                                                <span className="font-medium">
                                                    {patient.consent[0].otp_verified ? 'Verified' : 'Not Verified'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="lg:w-2/3 space-y-8">
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                            Pregnancy Details
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-700">Last Menstrual Period</span>
                                                <span>
                                                    {patient.pregnancy_details?.[0]?.last_menstrual_period
                                                        ? new Date(patient.pregnancy_details[0].last_menstrual_period).toLocaleDateString()
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-gray-700">Children Alive</span>
                                                <span>
                                                    {patient.pregnancy_details?.[0]?.number_of_children_alive || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {patient.pregnancy_details?.[0]?.children &&
                                        patient.pregnancy_details[0].children.length > 0 && (
                                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                                <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                                    Children Details
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {patient.pregnancy_details[0].children.map(child => (
                                                        <div key={child.id} className="border border-gray-100 p-4 rounded-lg">
                                                            <div className="flex justify-between mb-2">
                                                                <span className="font-semibold text-gray-700">Gender</span>
                                                                <span>{child.gender}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-semibold text-gray-700">Age</span>
                                                                <span>{child.age_in_years} years</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    {patient.procedures && patient.procedures.length > 0 && (
                                        <div className="bg-white rounded-xl p-6 shadow-sm">
                                            <h3 className="text-lg font-bold text-[#774C60] mb-4 uppercase">
                                                Procedures
                                            </h3>
                                            <div className="space-y-4">
                                                {patient.procedures.map(procedure => (
                                                    <div key={procedure.id} className="border border-gray-100 p-4 rounded-lg">
                                                        <div className="flex justify-between mb-3">
                                                            <span className="font-semibold text-gray-700">Date</span>
                                                            <span>
                                                                {new Date(procedure.procedure_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="mb-3">
                                                            <span className="font-semibold text-gray-700">Doctor</span>
                                                            <div className="mt-1">
                                                                {procedure.attending_doctor?.name}
                                                                <span className="text-sm text-gray-500 ml-2">
                                                                    ({procedure.attending_doctor?.qualifications})
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-700">Indications</span>
                                                            <ul className="mt-2 space-y-1">
                                                                {procedure.procedure_indications.map(pi => (
                                                                    <li key={pi.indication_type.id} className="text-sm text-gray-700">
                                                                        • {pi.indication_type.indication}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDetails;