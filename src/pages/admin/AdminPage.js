import React, { useState, useEffect } from 'react';
import { handleInputFileChange } from '../../utils/component-handler.ts';
import { saveTemplate, getTemplate, resetTemplate } from '../../services/templateService';
import { Link, useNavigate } from 'react-router-dom';
import inLogo from '../../images/in-logo.png';
import defaultTemplate from '../../images/template.jpg';

function AdminPage() {
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState(null);

  useEffect(() => {
    // Load the current template on component mount
    const loadTemplate = async () => {
      try {
        const template = await getTemplate();
        if (template) {
          setCurrentTemplate(template);
        }
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    };

    loadTemplate();
  }, []);

  const handleUploadTemplate = async () => {
    if (!templateFile) {
      setMessage('Pilih file gambar terlebih dahulu');
      return;
    }

    // Check if file is an image
    if (!templateFile.type.startsWith('image/')) {
      setMessage('File harus berupa gambar');
      return;
    }

    setIsUploading(true);
    setMessage('Mengupload template...');

    try {
      const result = await saveTemplate(templateFile);
      
      if (result.success) {
        setCurrentTemplate(result.url);
        setMessage('Template berhasil diupload');
        setTemplateFile(null); // Clear the selected file
      } else {
        setMessage(`Gagal upload template: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      setMessage('Terjadi kesalahan saat upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetTemplate = async () => {
    if (window.confirm('Apakah anda yakin ingin mengembalikan ke template default?')) {
      try {
        setMessage('Mereset template...');
        const result = await resetTemplate();
        
        if (result.success) {
          setCurrentTemplate(null);
          setMessage('Template berhasil direset ke default');
        } else {
          setMessage(`Gagal mereset template: ${result.error}`);
        }
      } catch (error) {
        console.error('Error resetting template:', error);
        setMessage('Terjadi kesalahan saat mereset template');
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Apakah anda yakin ingin logout?')) {
      localStorage.removeItem('adminAuthenticated');
      navigate('/');
    }
  };

  return (
    <div className="overflow-x-hidden">
      <nav>
        <div className="header w-full sticky w top-0 left-0 right-0 z-[99] h-12 p-4 py-7 flex items-center justify-between font-ysabeau font-medium text-xl lg:text-2xl text-gray-500">
          <div className="flex items-center">
            <span className="mr-2 inline-block w-[1.6rem] lg:w-[2rem]"><img className="h-full w-full" src={inLogo} alt="In Logo"/></span>STIBA Makassar
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-base text-gray-500 hover:text-gray-700">Beranda</Link>
            <button onClick={handleLogout} className="text-base text-red-500 hover:text-red-700">Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="min-h-screen bg-[#f2fdf5] flex flex-col items-center pt-10 pb-12">
        <div className="bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg overflow-hidden p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Panel</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Template Saat Ini</h2>
            <div className="border rounded-md p-2 bg-gray-50 mb-4">
              <img
                src={currentTemplate || defaultTemplate}
                alt="Template Saat Ini"
                className="max-h-64 mx-auto"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Template Baru</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File Gambar Template
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={(e) => handleInputFileChange(e, setTemplateFile)}
                key={templateFile ? 'has-file' : 'no-file'}
              />
            </div>
            
            {templateFile && (
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  File terpilih: {templateFile.name} ({(templateFile.size / 1024).toFixed(2)} KB)
                </p>
                <div className="mt-2 border rounded-md p-2 bg-gray-50">
                  <img
                    src={URL.createObjectURL(templateFile)}
                    alt="Preview"
                    className="max-h-64 mx-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                className="flex-1 h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]"
                onClick={handleUploadTemplate}
                disabled={isUploading || !templateFile}
              >
                {isUploading ? 'Uploading...' : 'Upload Template'}
              </button>
              
              {currentTemplate && (
                <button
                  className="flex-1 h-12 font-roboto bg-red-500 text-white rounded-xl hover:bg-red-600"
                  onClick={handleResetTemplate}
                  disabled={isUploading}
                >
                  Reset ke Default
                </button>
              )}
            </div>
            
            {message && (
              <div className={`mt-2 p-2 rounded-md text-center ${message.includes('berhasil') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message}
              </div>
            )}
          </div>
          
          <div className="mt-4 border-t pt-4">
            <Link
              to="/"
              className="block text-center text-blue-500 hover:underline"
            >
              Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
          © STIBA Makassar
        </div>
      </div>
    </div>
  );
}

export default AdminPage;