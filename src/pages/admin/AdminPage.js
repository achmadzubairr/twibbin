import React, { useState, useEffect } from 'react';
import { handleInputFileChange, handleInputChange } from '../../utils/component-handler.ts';
import { 
  createCampaign, 
  getCampaigns, 
  deleteCampaign, 
  toggleCampaignStatus,
  getCampaignAnalytics,
  updateCampaign,
  getCampaignById
} from '../../services/supabaseCampaignService';
import { 
  getAllDownloads, 
  getDownloadStats, 
  exportToCSV, 
  downloadCSV 
} from '../../services/downloadService';
import { Link, useNavigate } from 'react-router-dom';
import inLogo from '../../images/in-logo.png';

function AdminPage() {
  const navigate = useNavigate();
  
  
  // Campaign states
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'campaigns', 'analytics', or 'downloads'
  const [campaigns, setCampaigns] = useState([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    slug: '',
    templateFile: null,
    campaignType: 'text'
  });
  const [campaignMessage, setCampaignMessage] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  
  // Edit campaign states
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    templateFile: null,
    campaignType: 'text'
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Analytics states
  const [analytics, setAnalytics] = useState([]);
  const [downloadStats, setDownloadStats] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Load data on component mount
    const loadData = async () => {
      try {
        // Load campaigns
        const campaignsResult = await getCampaigns();
        if (campaignsResult.success) {
          setCampaigns(campaignsResult.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);


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
        setCampaigns([...campaigns, result.data]);
        setCampaignForm({ name: '', slug: '', templateFile: null, campaignType: 'text' });
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
    if (window.confirm('Apakah anda yakin ingin mengarsipkan campaign ini? Campaign akan disembunyikan dari public tapi data analytics tetap tersimpan.')) {
      try {
        const result = await deleteCampaign(campaignId);
        
        if (result.success) {
          setCampaigns(campaigns.filter(c => c.id !== campaignId));
          setCampaignMessage('Campaign berhasil diarsipkan');
        } else {
          setCampaignMessage(`Gagal mengarsipkan campaign: ${result.error}`);
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        setCampaignMessage('Terjadi kesalahan saat mengarsipkan campaign');
      }
    }
  };

  const handleEditCampaign = async (campaign) => {
    setEditingCampaign(campaign.id);
    setEditForm({
      name: campaign.name,
      slug: campaign.slug,
      templateFile: null,
      campaignType: campaign.campaign_type || 'text'
    });
    setActiveTab('create'); // Switch to create tab for editing
  };

  const handleUpdateCampaign = async () => {
    if (!editForm.name || !editForm.slug) {
      setCampaignMessage('Nama campaign dan slug wajib diisi');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(editForm.slug)) {
      setCampaignMessage('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung');
      return;
    }

    setIsUpdating(true);
    setCampaignMessage('Mengupdate campaign...');

    try {
      const result = await updateCampaign(editingCampaign, editForm);
      
      if (result.success) {
        // Update campaigns list
        setCampaigns(campaigns.map(c => 
          c.id === editingCampaign ? result.data : c
        ));
        
        // Reset edit state
        setEditingCampaign(null);
        setEditForm({ name: '', slug: '', templateFile: null, campaignType: 'text' });
        setCampaignMessage('Campaign berhasil diupdate');
        setActiveTab('campaigns'); // Switch back to campaigns list
      } else {
        setCampaignMessage(`Gagal update campaign: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      setCampaignMessage('Terjadi kesalahan saat update campaign');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCampaign(null);
    setEditForm({ name: '', slug: '', templateFile: null, campaignType: 'text' });
    setCampaignMessage('');
  };

  const handleToggleCampaignStatus = async (campaignId) => {
    try {
      const result = await toggleCampaignStatus(campaignId);
      
      if (result.success) {
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? result.data : c
        ));
        setCampaignMessage(`Campaign ${result.data.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
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

  // Analytics functions
  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const [analyticsResult, statsResult, downloadsResult] = await Promise.all([
        getCampaignAnalytics(),
        getDownloadStats(),
        getAllDownloads({ limit: 50 })
      ]);

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      }

      if (statsResult.success) {
        setDownloadStats(statsResult.data);
      }

      if (downloadsResult.success) {
        setDownloads(downloadsResult.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleExportDownloads = async () => {
    setIsExporting(true);
    try {
      const result = await getAllDownloads({ limit: 10000 }); // Export all
      if (result.success) {
        const csvContent = exportToCSV(result.data);
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(csvContent, `twibbin_downloads_${timestamp}.csv`);
      }
    } catch (error) {
      console.error('Failed to export downloads:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Load analytics when tab changes
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'downloads') {
      loadAnalytics();
    }
  }, [activeTab]);

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
          <div className="flex mb-6 border-b overflow-x-auto">
            <button
              className={`px-4 py-2 mr-2 whitespace-nowrap ${activeTab === 'create' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('create')}
            >
              Buat Campaign
            </button>
            <button
              className={`px-4 py-2 mr-2 whitespace-nowrap ${activeTab === 'campaigns' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('campaigns')}
            >
              List Campaign
            </button>
            <button
              className={`px-4 py-2 mr-2 whitespace-nowrap ${activeTab === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
            <button
              className={`px-4 py-2 whitespace-nowrap ${activeTab === 'downloads' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('downloads')}
            >
              Downloads
            </button>
          </div>
          
          {/* Buat/Edit Campaign Tab */}
          {activeTab === 'create' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingCampaign ? 'Edit Campaign' : 'Buat Campaign Baru'}
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Campaign
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={editingCampaign ? editForm.campaignType : campaignForm.campaignType}
                    onChange={(e) => {
                      const campaignType = e.target.value;
                      if (editingCampaign) {
                        setEditForm({...editForm, campaignType});
                      } else {
                        setCampaignForm({...campaignForm, campaignType});
                      }
                    }}
                    disabled={editingCampaign} // Don't allow changing type when editing
                  >
                    <option value="text">Text Campaign (Nama + Teks Tambahan)</option>
                    <option value="photo">Photo Campaign (Upload Foto User)</option>
                  </select>
                  {editingCampaign && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tipe campaign tidak dapat diubah saat editing
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Campaign
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={editingCampaign ? editForm.name : campaignForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      if (editingCampaign) {
                        setEditForm({
                          ...editForm,
                          name,
                          slug: editForm.slug // Don't auto-generate slug when editing
                        });
                      } else {
                        setCampaignForm({
                          ...campaignForm,
                          name,
                          slug: generateSlugFromName(name)
                        });
                      }
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
                    value={editingCampaign ? editForm.slug : campaignForm.slug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      if (editingCampaign) {
                        setEditForm({...editForm, slug});
                      } else {
                        setCampaignForm({...campaignForm, slug});
                      }
                    }}
                    placeholder="url-slug-campaign"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {window.location.origin}/{editingCampaign ? editForm.slug : campaignForm.slug}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Campaign {editingCampaign && '(kosongkan jika tidak ingin mengubah template)'}
                  </label>
                  {(editingCampaign ? editForm.campaignType : campaignForm.campaignType) === 'photo' && (
                    <p className="text-xs text-blue-600 mb-2">
                      Untuk photo campaign: foto user akan muncul dalam template ini
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (editingCampaign) {
                        setEditForm({...editForm, templateFile: file});
                      } else {
                        setCampaignForm({...campaignForm, templateFile: file});
                      }
                    }}
                  />
                </div>

                {(editingCampaign ? editForm.templateFile : campaignForm.templateFile) && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      File terpilih: {(editingCampaign ? editForm.templateFile : campaignForm.templateFile).name} ({((editingCampaign ? editForm.templateFile : campaignForm.templateFile).size / 1024).toFixed(2)} KB)
                    </p>
                    <div className="mt-2 border rounded-md p-2 bg-gray-50">
                      <img
                        src={URL.createObjectURL(editingCampaign ? editForm.templateFile : campaignForm.templateFile)}
                        alt="Preview"
                        className="max-h-64 mx-auto"
                      />
                    </div>
                  </div>
                )}

                {editingCampaign ? (
                  <div className="flex gap-2 mb-4">
                    <button
                      className="flex-1 h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]"
                      onClick={handleUpdateCampaign}
                      disabled={isUpdating || !editForm.name || !editForm.slug}
                    >
                      {isUpdating ? 'Mengupdate...' : 'Update Campaign'}
                    </button>
                    <button
                      className="flex-1 h-12 font-roboto bg-gray-500 text-white rounded-xl hover:bg-gray-600"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2] mb-4"
                    onClick={handleCreateCampaign}
                    disabled={isCreatingCampaign || !campaignForm.name || !campaignForm.slug || !campaignForm.templateFile}
                  >
                    {isCreatingCampaign ? 'Membuat Campaign...' : 'Buat Campaign'}
                  </button>
                )}

                {campaignMessage && (
                  <div className={`p-2 rounded-md text-center ${campaignMessage.includes('berhasil') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {campaignMessage}
                  </div>
                )}
              </div>
            </>
          )}

          {/* List Campaign Tab */}
          {activeTab === 'campaigns' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Daftar Campaign</h2>
                <div className="text-sm text-gray-500">
                  Total: {campaigns.length} campaign
                </div>
              </div>

              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Belum ada campaign</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <p className="text-sm text-gray-600">/{campaign.slug}</p>
                          <p className="text-xs text-gray-500">
                            Dibuat: {new Date(campaign.created_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {campaign.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${campaign.campaign_type === 'photo' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {campaign.campaign_type === 'photo' ? 'Foto' : 'Teks'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <img
                          src={campaign.template_url}
                          alt={`Template ${campaign.name}`}
                          className="max-h-24 mx-auto rounded"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Add debounce protection
                            const now = Date.now();
                            if (window.lastAdminClick && now - window.lastAdminClick < 1000) {
                              return;
                            }
                            window.lastAdminClick = now;
                            setTimeout(() => {
                              window.open(`${window.location.origin}/${campaign.slug}`, '_blank');
                            }, 100);
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                          style={{ touchAction: 'manipulation' }}
                        >
                          Lihat
                        </button>
                        <button
                          className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                          onClick={() => handleEditCampaign(campaign)}
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`px-3 py-1 text-sm rounded ${campaign.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                          onClick={() => handleToggleCampaignStatus(campaign.id)}
                        >
                          {campaign.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          Arsipkan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <>
              {isLoadingAnalytics ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14eb99] mx-auto mb-4"></div>
                  <p>Memuat analytics...</p>
                </div>
              ) : (
                <>
                  {/* Overview Stats */}
                  {downloadStats && (
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-4">Overview</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{downloadStats.total}</div>
                          <div className="text-sm text-blue-500">Total Downloads</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{downloadStats.today}</div>
                          <div className="text-sm text-green-500">Hari Ini</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-600">{downloadStats.thisWeek}</div>
                          <div className="text-sm text-purple-500">Minggu Ini</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-orange-600">{downloadStats.uniqueUsers}</div>
                          <div className="text-sm text-orange-500">Unique Users</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Analytics */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Campaign Performance</h2>
                      <div className="text-sm text-gray-500">
                        {analytics.length} campaign
                      </div>
                    </div>
                    
                    {analytics.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Belum ada data analytics</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {analytics.map((campaign) => (
                          <div key={campaign.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold">{campaign.name}</h3>
                                <p className="text-sm text-gray-600">/{campaign.slug}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {campaign.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${campaign.campaign_type === 'photo' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {campaign.campaign_type === 'photo' ? 'Foto' : 'Teks'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="font-bold text-blue-600 text-lg">{campaign.total_downloads || 0}</div>
                                <div className="text-gray-600 text-xs">Total Downloads</div>
                              </div>
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-bold text-green-600 text-lg">{campaign.unique_users || 0}</div>
                                <div className="text-gray-600 text-xs">Unique Users</div>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded">
                                <div className="font-bold text-purple-600 text-lg">{campaign.downloads_today || 0}</div>
                                <div className="text-gray-600 text-xs">Hari Ini</div>
                              </div>
                              <div className="text-center p-2 bg-orange-50 rounded">
                                <div className="font-bold text-orange-600 text-lg">{campaign.downloads_this_week || 0}</div>
                                <div className="text-gray-600 text-xs">Minggu Ini</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Names */}
                  {downloadStats?.topNames && downloadStats.topNames.length > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Nama Paling Populer</h2>
                        <div className="text-sm text-gray-500">
                          Top {Math.min(downloadStats.topNames.length, 15)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {downloadStats.topNames.slice(0, 15).map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-1">
                              <div className="flex items-center">
                                <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center mr-3">
                                  {index + 1}
                                </span>
                                <span className="text-sm font-medium">{item.item}</span>
                              </div>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                {item.count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <div className="text-center">
                    <button
                      onClick={loadAnalytics}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Refresh Analytics
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Downloads Tab */}
          {activeTab === 'downloads' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Downloads</h2>
                <button
                  onClick={handleExportDownloads}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 text-sm"
                >
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              {isLoadingAnalytics ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14eb99] mx-auto mb-4"></div>
                  <p>Memuat downloads...</p>
                </div>
              ) : downloads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Belum ada download</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {downloads.map((download) => (
                    <div key={download.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{download.user_name}</div>
                          <div className="text-sm text-gray-600">
                            {download.campaigns?.name || 'Unknown Campaign'}
                          </div>
                          {download.additional_text && (
                            <div className="text-sm text-gray-500">"{download.additional_text}"</div>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{new Date(download.download_time).toLocaleDateString('id-ID')}</div>
                          <div>{new Date(download.download_time).toLocaleTimeString('id-ID')}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>{download.filename}</span>
                        <span>{download.ip_address || 'Unknown IP'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
            </>
          )}
          
        </div>
        
        <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
          © STIBA Makassar
        </div>
      </div>
    </div>
  );
}

export default AdminPage;