import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOtp(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (otp !== '123456') {
        setError('Invalid OTP');
        return;
      }

      // Sign in with phone number (using email format for now)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${phoneNumber}@example.com`,
        password: phoneNumber,
      });

      if (authError) throw authError;

      // Get diagnostic center details
      const { data: centerData, error: centerError } = await supabase
        .from('diagnostic_centers')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (centerError) throw centerError;

      login({
        id: centerData.id,
        name: centerData.name,
        phoneNumber: centerData.phone_number
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Login Form */}
      <div className="w-full flex items-center justify-center lg:w-1/2 bg-[#FFF4E8] p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4">
          <div className="text-center mb-12">
            <Phone className="mx-auto h-16 w-16 text-[#B75D69]" />
            <h2 className="mt-6 text-4xl font-bold text-[#774C60]">
              Welcome Back
            </h2>
            <p className="mt-3 text-lg text-[#B75D69]">
              Sign in to your account
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!showOtp ? (
            <form onSubmit={handleSendOtp}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="phone" className="block text-base font-medium text-[#774C60] mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#DEB6AB] px-6 py-4 text-lg text-gray-900 focus:border-[#B75D69] focus:ring-2 focus:ring-[#B75D69] focus:ring-opacity-50 transition-colors duration-200"
                    required
                    placeholder="Enter your mobile number"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#774C60] text-white rounded-lg py-4 px-6 text-lg font-medium hover:bg-[#B75D69] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B75D69] focus:ring-offset-2"
                >
                  Send OTP
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-base font-medium text-[#774C60] mb-3">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#DEB6AB] px-6 py-4 text-lg text-gray-900 focus:border-[#B75D69] focus:ring-2 focus:ring-[#B75D69] focus:ring-opacity-50 transition-colors duration-200"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                  />
                  <p className="mt-3 text-sm text-[#B75D69]">Use 123456 as the OTP for testing</p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#774C60] text-white rounded-lg py-4 px-6 text-lg font-medium hover:bg-[#B75D69] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B75D69] focus:ring-offset-2"
                >
                  Verify OTP
                </button>
              </div>
            </form>
          )}

          <p className="mt-12 text-center text-base text-[#774C60]">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-[#B75D69] hover:text-[#774C60] transition-colors duration-200">
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Section - Illustration/Welcome */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FFF4E8] p-6">
        <div className="w-full h-full bg-[#DEB6AB] rounded-xl p-12 flex items-center justify-center">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold mb-6 text-[#774C60]">Welcome to Our Platform</h1>
            <p className="text-lg mb-8 text-[#774C60]">Access your diagnostic center dashboard and manage your services efficiently.</p>
            <div className="w-full max-w-md">
              <img 
                src="/assets/logo.png"
                alt="Platform Logo"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}