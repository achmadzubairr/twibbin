import React, { useState, useEffect } from 'react';
import { handleInputFileChange, handleInputChange } from '../../utils/component-handler.ts';
import { saveTemplate, getTemplate, resetTemplate } from '../../services/templateService';
import { createCampaign, getCampaigns, deleteCampaign, toggleCampaignStatus } from '../../services/campaignService';
import { Link, useNavigate } from 'react-router-dom';
import inLogo from '../../images/in-logo.png';
import defaultTemplate from '../../images/template.jpg';

function AdminPage() {
  const navigate = useNavigate();
  
  // Global template states
  const [templateFile, setTemplateFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  
  // Campaign states
  const [activeTab, setActiveTab] = useState('template'); // 'template' or 'campaigns'
  const [campaigns, setCampaigns] = useState([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    slug: '',
    templateFile: null
  });
  const [campaignMessage, setCampaignMessage] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  useEffect(() => {
    // Load data on component mount
    const loadData = async () => {
      try {
        // Load global template
        const template = await getTemplate();
        if (template) {
          setCurrentTemplate(template);
        }
        
        // Load campaigns
        const campaignsData = await getCampaigns();
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
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

  // Campaign functions
  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.slug || !campaignForm.templateFile) {
      setCampaignMessage('Nama campaign, slug, dan template wajib diisi');
      return;
    }

    // Validate slug format (no spaces, special chars)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(campaignForm.slug)) {
      setCampaignMessage('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung');
      return;
    }

    setIsCreatingCampaign(true);
    setCampaignMessage('Membuat campaign...');

    try {
      const result = await createCampaign(campaignForm);
      
      if (result.success) {
        setCampaigns([...campaigns, result.campaign]);
        setCampaignForm({ name: '', slug: '', templateFile: null });
        setCampaignMessage('Campaign berhasil dibuat');
      } else {
        setCampaignMessage(`Gagal membuat campaign: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      setCampaignMessage('Terjadi kesalahan saat membuat campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Apakah anda yakin ingin menghapus campaign ini?')) {
      try {
        const result = await deleteCampaign(campaignId);
        
        if (result.success) {
          setCampaigns(campaigns.filter(c => c.id !== campaignId));
          setCampaignMessage('Campaign berhasil dihapus');
        } else {
          setCampaignMessage(`Gagal menghapus campaign: ${result.error}`);
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        setCampaignMessage('Terjadi kesalahan saat menghapus campaign');
      }
    }
  };

  const handleToggleCampaignStatus = async (campaignId) => {
    try {
      const result = await toggleCampaignStatus(campaignId);
      
      if (result.success) {
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? result.campaign : c
        ));
        setCampaignMessage(`Campaign ${result.campaign.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        setCampaignMessage(`Gagal mengubah status: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling campaign status:', error);
      setCampaignMessage('Terjadi kesalahan saat mengubah status');
    }
  };

  const generateSlugFromName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
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
          
          {/* Tab Navigation */}
          <div className="flex mb-6 border-b">
            <button
              className={`px-4 py-2 mr-2 ${activeTab === 'template' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('template')}
            >
              Global Template
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'campaigns' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('campaigns')}
            >
              Campaign Management
            </button>
          </div>
          
          {/* Global Template Tab */}
          {activeTab === 'template' && (
            <>
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
            </>
          )}

          {/* Campaign Management Tab */}
          {activeTab === 'campaigns' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Buat Campaign Baru</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Campaign
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={campaignForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCampaignForm({
                        ...campaignForm,
                        name,
                        slug: generateSlugFromName(name)
                      });
                    }}
                    placeholder="Masukkan nama campaign"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug URL
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={campaignForm.slug}
                    onChange={(e) => setCampaignForm({...campaignForm, slug: e.target.value})}
                    placeholder="url-slug-campaign"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {window.location.origin}/{campaignForm.slug}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Campaign
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    onChange={(e) => setCampaignForm({...campaignForm, templateFile: e.target.files[0]})}
                  />
                </div>

                {campaignForm.templateFile && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      File terpilih: {campaignForm.templateFile.name} ({(campaignForm.templateFile.size / 1024).toFixed(2)} KB)
                    </p>
                    <div className="mt-2 border rounded-md p-2 bg-gray-50">
                      <img
                        src={URL.createObjectURL(campaignForm.templateFile)}
                        alt="Preview"
                        className="max-h-64 mx-auto"
                      />
                    </div>
                  </div>
                )}

                <button
                  className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2] mb-4"
                  onClick={handleCreateCampaign}
                  disabled={isCreatingCampaign || !campaignForm.name || !campaignForm.slug || !campaignForm.templateFile}
                >
                  {isCreatingCampaign ? 'Membuat Campaign...' : 'Buat Campaign'}
                </button>

                {campaignMessage && (
                  <div className={`p-2 rounded-md text-center ${campaignMessage.includes('berhasil') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {campaignMessage}
                  </div>
                )}
              </div>

              {/* Campaign List */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Daftar Campaign</h2>
                
                {campaigns.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Belum ada campaign</p>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-md p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <p className="text-sm text-gray-600">/{campaign.slug}</p>
                            <p className="text-xs text-gray-500">
                              Dibuat: {new Date(campaign.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {campaign.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <img
                            src={campaign.templateUrl}
                            alt={`Template ${campaign.name}`}
                            className="max-h-32 mx-auto"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => window.open(`${window.location.origin}/${campaign.slug}`, '_blank')}
                          >
                            Lihat
                          </button>
                          <button
                            className={`flex-1 px-3 py-1 text-sm rounded ${campaign.isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                            onClick={() => handleToggleCampaignStatus(campaign.id)}
                          >
                            {campaign.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button
                            className="flex-1 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          
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