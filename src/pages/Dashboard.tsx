import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Calendar, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

interface Patient {
  id: string;
  name: string;
  age: number;
  contact_number: string;
  created_at: string;
  pregnancy_details?: {
    last_menstrual_period: string;
  }[];
  pregnancy_details_with_gestation?: {
    period_of_gestation_weeks: number;
    period_of_gestation_days: number;
  }[];
}

// New interface for CSV export
interface ExportPatientData {
  'S. No.': number;
  'Date': string;
  'Patient Name': string;
  'Age': number;
  'Gender': string;
  'Husband Name': string;
  'Father Name': string;
  'Last Menstrual Period Date (LMP)': string;
  'Period of Gestation (POG)': string;
  'Expected Date of Delivery (EDD)': string;
  'Total number of children': number;
  'Total number of girls': number;
  'Total number of boys': number;
  'Details of girls (age)': string;
  'Details of boys (age)': string;
  'Patient\'s present address': string;
  'Patient\'s aadhar address': string;
  'Referring Doctor Name': string;
  'Referring Doctor Registration No.': string;
  'Referring Doctor Address': string;
  'Performing Doctor Registration No.': string;
  'Performing Doctor Address': string;
  'Performing Doctor Name': string;
  'Indication(s) of Ultrasound': string;
  'Scan performed': string;
  'Result Of USG Scan': string;
  'Indication for MTP': string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { diagnosticCenter } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(10);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('pregnant_women')
        .select(`
          *,
          pregnancy_details (
            last_menstrual_period
          ),
          pregnancy_details_with_gestation (
            period_of_gestation_weeks,
            period_of_gestation_days
          )
        `)
        .eq('diagnostic_center_id', diagnosticCenter.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const exportToCSV = async () => {
    try {
      setLoading(true);
      
      // Get current date and first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Fetch detailed patient data for the current month
      const { data: monthlyData, error } = await supabase
        .from('pregnant_women')
        .select(`
          *,
          pregnancy_details (
            last_menstrual_period,
            number_of_children_alive,
            children (
              gender,
              age_in_years
            )
          ),
          procedures (
            procedure_date,
            attending_doctor:performing_doctors (
              name,
              registration_number,
              contact_info
            ),
         
            procedure_indications (
              indication_type:indication_types (
                indication
              )
            )
          )
        `)
        .eq('diagnostic_center_id', diagnosticCenter.id)
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', now.toISOString());

      if (error) throw error;

      // Transform data to CSV format
      const csvData: ExportPatientData[] = monthlyData.map((patient, index) => {
        // Calculate EDD (Expected Date of Delivery)
        const lmp = patient.pregnancy_details?.[0]?.last_menstrual_period;
        const edd = lmp ? new Date(new Date(lmp).getTime() + (280 * 24 * 60 * 60 * 1000)) : null;

        // Separate children by gender
        const children = patient.pregnancy_details?.[0]?.children || [];
        const girls = children.filter(child => child.gender.toLowerCase() === 'female');
        const boys = children.filter(child => child.gender.toLowerCase() === 'male');

        // Get latest procedure details
        const latestProcedure = patient.procedures?.[0];

        return {
          'S. No.': index + 1,
          'Date': new Date(patient.created_at).toLocaleDateString(),
          'Patient Name': patient.name,
          'Age': patient.age,
          'Gender': 'Female', // Always female as these are pregnant women
          'Husband Name': patient.husband_name || '',
          'Father Name': patient.father_name || '',
          'Last Menstrual Period Date (LMP)': lmp ? new Date(lmp).toLocaleDateString() : '',
          'Period of Gestation (POG)': patient.pregnancy_details_with_gestation?.[0] 
            ? `${patient.pregnancy_details_with_gestation[0].period_of_gestation_weeks} Weeks ${patient.pregnancy_details_with_gestation[0].period_of_gestation_days} Days`
            : '',
          'Expected Date of Delivery (EDD)': edd ? edd.toLocaleDateString() : '',
          'Total number of children': patient.pregnancy_details?.[0]?.number_of_children_alive || 0,
          'Total number of girls': girls.length,
          'Total number of boys': boys.length,
          'Details of girls (age)': girls.map(g => g.age_in_years).join(', '),
          'Details of boys (age)': boys.map(b => b.age_in_years).join(', '),
          'Patient\'s present address': patient.present_address,
          'Patient\'s aadhar address': patient.aadhar_card_address,
          'Referring Doctor Name': latestProcedure?.referring_doctor?.name || '', // Add if you have this data
          'Referring Doctor Registration No.': latestProcedure?.referring_doctor?.registration_number || '',
          'Referring Doctor Address': latestProcedure?.referring_doctor?.hospital_address || '',
          'Performing Doctor Registration No.': latestProcedure?.attending_doctor?.registration_number || '',
          'Performing Doctor Address': latestProcedure?.attending_doctor?.address || '',
          'Performing Doctor Name': latestProcedure?.attending_doctor?.name || '',
          'Indication(s) of Ultrasound': latestProcedure?.procedure_indications
            ?.map(pi => pi.indication_type.indication)
            .join('; ') || '',
          'Scan performed': 'Yes',
          'Result Of USG Scan': '', // Add if you have this data
          'Indication for MTP': '' // Add if you have this data
        };
      });

      // Convert to CSV
      const headers = Object.keys(csvData[0]);
      const csvString = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `patient_data_${now.toLocaleDateString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF4E8]">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-[#DEB6AB] bg-opacity-20">
                <Users className="h-8 w-8 text-[#774C60]" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Patients</p>
                <h3 className="text-3xl font-bold text-[#774C60]">
                  {loading ? '...' : patients.length}
                </h3>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/add-patient')}
            className="bg-gradient-to-br from-[#774C60] to-[#B75D69] rounded-2xl shadow-lg p-6 cursor-pointer transform hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-white bg-opacity-20">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <div className="ml-5">
                <h3 className="text-xl font-semibold text-white">Add New Patient</h3>
                <p className="text-sm text-white text-opacity-90">
                  Register a new patient
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-[#DEB6AB] bg-opacity-20">
                <Calendar className="h-8 w-8 text-[#774C60]" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Today's Date</p>
                <h3 className="text-xl font-bold text-[#774C60]">
                  {new Date().toLocaleDateString('en-US', { 
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Patients Table Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-[#774C60]">Recent Patients</h2>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#774C60] text-white hover:bg-[#B75D69] transition-colors duration-200"
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Monthly Data
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#774C60] border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading patients data...</p>
            </div>
          ) : currentPatients.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-[#DEB6AB] bg-opacity-20 flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-[#774C60] opacity-50" />
              </div>
              <p className="text-gray-500 text-lg">No patients found</p>
              <button
                onClick={() => navigate('/add-patient')}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-[#774C60] text-white hover:bg-[#B75D69] transition-colors duration-200"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add Your First Patient
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Age', 'Contact', 'LMP', 'Gestation Period', 'Registered'].map((header) => (
                      <th key={header} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPatients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/patient-details/${patient.id}`} className="text-sm font-medium text-[#774C60] hover:underline">
                          {patient.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.age}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.contact_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.pregnancy_details?.[0]?.last_menstrual_period
                            ? formatDate(patient.pregnancy_details[0].last_menstrual_period)
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.pregnancy_details_with_gestation?.[0]
                            ? `${patient.pregnancy_details_with_gestation[0].period_of_gestation_weeks} weeks, ${patient.pregnancy_details_with_gestation[0].period_of_gestation_days} days`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(patient.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69] transition-colors duration-200"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69] transition-colors duration-200"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}