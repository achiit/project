import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, LogOut, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { diagnosticCenter, logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF4E8]">
      {/* Modern Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src="/assets/logo.png"
                  alt="Logo"
                  className="h-12 w-auto"
                />
              </div>
              <h1 className="ml-4 text-2xl font-bold text-[#774C60]">
                {diagnosticCenter?.name || 'Diagnostic Center'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 rounded-lg border-2 border-[#774C60] text-[#774C60] hover:bg-[#774C60] hover:text-white transition-all duration-200"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

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
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#774C60]">Recent Patients</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#774C60] border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading patients data...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-[#DEB6AB] bg-opacity-20 flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-[#774C60] opacity-50" />
              </div>
              <p className="text-gray-500 text-lg">No patients added yet</p>
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
                  {patients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#774C60]">{patient.name}</div>
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
      </main>
    </div>
  );
}