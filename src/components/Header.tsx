import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { diagnosticCenter, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
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
  );
};

export default Header; 