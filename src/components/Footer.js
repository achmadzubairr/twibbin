import React from 'react';
import inLogo from '../images/in-logo.png';

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and Institution */}
          <div className="flex items-center mb-4 md:mb-0">
            <span className="mr-3 inline-block w-8 h-8">
              <img className="h-full w-full" src={inLogo} alt="STIBA Makassar Logo"/>
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800">STIBA Makassar</span>
              <span className="text-sm text-gray-600">Sekolah Tinggi Ilmu Islam dan Bahasa Arab</span>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-600">
              © {currentYear} STIBA Makassar. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Twibbin - Platform Kartu Ucapan Digital
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;