import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { handleInputChange, refCallback } from '../../utils/component-handler.ts';
import html2canvas from 'html2canvas';
import inLogo from '../../images/in-logo.png';
import { Link } from 'react-router-dom';
import { getCampaignBySlug } from '../../services/supabaseCampaignService';
import { trackDownload } from '../../services/downloadService';
import { validateImageFile, createCustomPositionedImage } from '../../utils/imageProcessor';
import PhotoEditor from '../../components/PhotoEditor';

function CampaignPage() {
  const { slug } = useParams();
  const [name, setName] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [pregeneratedImage, setPregeneratedImage] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Photo campaign states
  const [userPhoto, setUserPhoto] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [transformData, setTransformData] = useState(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const imageSize = 1000;

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);
        const result = await getCampaignBySlug(slug);
        
        if (!result.success || !result.data) {
          setError('Campaign tidak ditemukan atau tidak aktif');
          return;
        }
        
        setCampaign(result.data);
      } catch (error) {
        console.error('Failed to load campaign:', error);
        setError('Gagal memuat campaign');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadCampaign();
    }

  }, [slug]);

  // Set meta tags for social media preview
  useEffect(() => {
    if (campaign) {
      const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
      
      // Set title
      document.title = `Twibbin | Buat ${campaign.name}`;
      
      // Set meta description
      const description = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda`;
      
      // Update or create meta tags
      const updateMetaTag = (property, content) => {
        let meta = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          if (property.startsWith('og:') || property.startsWith('twitter:')) {
            meta.setAttribute('property', property);
          } else {
            meta.setAttribute('name', property);
          }
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      updateMetaTag('description', description);
      updateMetaTag('og:title', `Twibbin | Buat ${campaign.name}`);
      updateMetaTag('og:description', description);
      updateMetaTag('og:image', campaign.template_url);
      updateMetaTag('og:url', window.location.href);
      updateMetaTag('og:type', 'website');
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `Twibbin | Buat ${campaign.name}`);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', campaign.template_url);
    }
  }, [campaign]);

  const generateRandomId = () => {
    return Math.random().toString(36).substring(2, 7);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError('');
    setProcessingPhoto(true);

    try {
      // Validate file
      const validation = await validateImageFile(file, 5);
      if (!validation.valid) {
        setUploadError(validation.error);
        setProcessingPhoto(false);
        return;
      }

      // Set user photo
      setUserPhoto(file);

      // Show photo editor
      setShowPhotoEditor(true);

      // No need to generate initial image - PhotoEditor will handle it
    } catch (error) {
      console.error('Error processing photo:', error);
      setUploadError('Gagal memproses foto. Coba lagi.');
    } finally {
      setProcessingPhoto(false);
    }
  };


  const handlePositionChange = async (newTransformData) => {
    setTransformData(newTransformData);
  };

  const handleGestureStateChange = (isActive) => {
    setIsGestureActive(isActive);
  };

  const cleanNameForFilename = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .substring(0, 20); // Limit to 20 characters
  };

  const handleDownloadImage = async () => {
    // Photo campaign download
    if (campaign?.campaign_type === 'photo' && transformData) {
      try {
        setIsDownloading(true);
        
        // Track download in database first
        const trackResult = await trackDownload({
          campaignId: campaign.id,
          userName: userPhoto?.name || 'photo_user',
          additionalText: '',
          campaignSlug: campaign.slug
        });

        if (!trackResult.success) {
          console.warn('Failed to track download:', trackResult.error);
        }

        // Generate final image with current transform data
        const finalImage = await createCustomPositionedImage(
          campaign.template_url,
          userPhoto,
          transformData,
          1000,
          1000
        );
        // Download the final image
        const a = document.createElement('a');
        a.href = finalImage;
        const fallbackFilename = `${campaign.slug}_photo_${generateRandomId()}.jpg`;
        a.download = trackResult.filename || fallbackFilename;
        a.click();
      } catch (error) {
        console.error('Error downloading processed image:', error);
        alert('Gagal mengunduh gambar. Coba lagi.');
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    // Text campaign download (existing logic)
    if (pregeneratedImage != null && campaign && name.trim()) {
      const scaleSize = imageSize / pregeneratedImage.offsetWidth;

      try {
        // Track download in database first
        const trackResult = await trackDownload({
          campaignId: campaign.id,
          userName: name.trim(),
          additionalText: additionalText.trim(),
          campaignSlug: campaign.slug
        });

        if (!trackResult.success) {
          console.warn('Failed to track download:', trackResult.error);
        }

        // Generate and download image
        const canvas = await html2canvas(pregeneratedImage, { 
          scale: scaleSize,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null
        });

        const a = document.createElement('a');
        a.href = canvas.toDataURL("image/jpeg", 1.0);
        // Use filename from tracking or fallback with new format
        const fallbackFilename = `${campaign.slug}_${cleanNameForFilename(name.trim())}_${generateRandomId()}.jpg`;
        a.download = trackResult.filename || fallbackFilename;
        a.click();
      } catch (error) {
        console.error('Error generating/downloading image:', error);
        alert('Gagal mengunduh gambar. Coba lagi.');
      }
    }
  };

  const handleShareWhatsApp = () => {
    const currentUrl = window.location.href;
    const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
    const text = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin! ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareFacebook = () => {
    const currentUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleShareTwitter = () => {
    const currentUrl = window.location.href;
    const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
    const text = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback untuk browser yang tidak support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        alert('Gagal menyalin link. Silakan salin manual dari address bar.');
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2fdf5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14eb99] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f2fdf5] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
          <Link to="/" className="text-blue-500 hover:underline">
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <nav>
        <div className="header w-full sticky w top-0 left-0 right-0 z-[99] h-12 p-4 py-7 flex items-center justify-between font-ysabeau font-medium text-xl lg:text-2xl text-gray-500">
          <div className="flex items-center">
            <span className="mr-2 inline-block w-[1.6rem] lg:w-[2rem]"><img className="h-full w-full" src={inLogo} alt="In Logo"/></span>STIBA Makassar
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-base text-gray-500 hover:text-gray-700">Beranda</Link>
            <Link to="/admin" className="text-base text-gray-500 hover:text-gray-700">Admin</Link>
          </div>
        </div>
        <div className="flex flex-col items-center pt-10 w-full min-h-screen pb-12 bg-[#f2fdf5]">
          <div className="bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg overflow-hidden">
            <div className="image-container">
              {campaign.campaign_type === 'photo' ? (
                // Photo Campaign - Show Editor if editing, otherwise show final result
                <div className="w-full relative">
                  {showPhotoEditor && userPhoto ? (
                    // Show PhotoEditor integrated in main preview
                    <div className="w-full">
                      <PhotoEditor
                        templateUrl={campaign.template_url}
                        userPhoto={userPhoto}
                        onPositionChange={handlePositionChange}
                        onGestureStateChange={handleGestureStateChange}
                      />
                    </div>
                  ) : processedImage ? (
                    // Show final processed image
                    <img src={processedImage} alt="Final preview" className="w-full" />
                  ) : (
                    // Show template only
                    <img src={campaign.template_url} alt="Template" crossOrigin="anonymous"/>
                  )}
                </div>
              ) : (
                // Text Campaign Preview (existing)
                <div ref={(element) => refCallback(element, setPregeneratedImage)} className="w-full relative">
                  <img src={campaign.template_url} alt="Template" crossOrigin="anonymous"/>
                  <div className="absolute h-[3rem] md:h-[4.1rem] lg:h-[5.1rem] w-full bottom-0 left-0 right-0 flex justify-center">
                    <div className="block font-monsterrat text-center leading-[0.45rem] md:leading-[0.75rem] lg:leading-[0.95rem] text-[#444444]">
                      <span className="font-bold text-[0.48rem] md:text-[0.72rem] lg:text-[0.92rem]">{name}</span><br/>
                      <span className="font-medium text-[0.42rem] md:text-[0.65rem] lg:text-[0.82rem]">{additionalText}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 px-4 pb-4">
              {campaign.campaign_type === 'photo' ? (
                // Photo Campaign Inputs
                <>
                  {!showPhotoEditor ? (
                    // Upload Phase
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Foto Anda
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="w-full p-2 border border-[#5e5e5e] rounded-xl text-sm"
                        disabled={processingPhoto}
                      />
                      {uploadError && (
                        <p className="text-red-500 text-xs mt-1">{uploadError}</p>
                      )}
                      {processingPhoto && (
                        <div className="flex items-center mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14eb99] mr-2"></div>
                          <span className="text-sm text-gray-600">Memproses foto...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Edit Phase - Simple controls only
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Atur Posisi Foto</h3>
                        <button
                          onClick={() => {
                            setShowPhotoEditor(false);
                            setUserPhoto(null);
                            setProcessedImage(null);
                            setTransformData(null);
                            setIsGestureActive(false);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 relative z-50"
                        >
                          Ganti Foto
                        </button>
                      </div>
                      
                      {/* Status indicator */}
                      {isGestureActive && (
                        <div className="flex items-center justify-center py-2 mb-2">
                          <div className="animate-pulse h-2 w-2 bg-orange-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-600">Menunggu posisi stabil...</span>
                        </div>
                      )}
                      
                      
                      <button 
                        disabled={!transformData || isGestureActive || isDownloading} 
                        className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]" 
                        onClick={handleDownloadImage}>
                        {isDownloading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Memproses...
                          </div>
                        ) : isGestureActive ? 
                          'Tunggu posisi stabil...' : 
                          transformData ? 'Unduh Gambar' : 'Atur foto dulu...'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // Text Campaign Inputs (existing)
                <>
                  <input 
                    className="w-full block font-roboto p-2 px-4 border border-[#5e5e5e] rounded-xl mb-2" 
                    type="text" placeholder="Nama" 
                    value={name}
                    onChange={(e) => handleInputChange(e, setName, 25)}
                    />
                  <input 
                    className="w-full block font-roboto p-2 px-4 border border-[#5e5e5e] rounded-xl mb-4" 
                    type="text" placeholder="Teks tambahan" 
                    value={additionalText} 
                    onChange={(e) => handleInputChange(e, setAdditionalText, 25)}
                    />
                  <button 
                    disabled={name === ''} 
                    className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]" 
                    onClick={handleDownloadImage}>
                    Unduh
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mt-6 bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">Bagikan Campaign</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 border border-green-200"
              >
                <span className="text-2xl mb-1">💬</span>
                <span className="text-sm font-medium text-green-700">WhatsApp</span>
              </button>
              
              <button
                onClick={handleShareFacebook}
                className="flex flex-col items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
              >
                <span className="text-2xl mb-1">📘</span>
                <span className="text-sm font-medium text-blue-700">Facebook</span>
              </button>
              
              <button
                onClick={handleShareTwitter}
                className="flex flex-col items-center p-3 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors duration-200 border border-sky-200"
              >
                <span className="text-2xl mb-1">🐦</span>
                <span className="text-sm font-medium text-sky-700">Twitter</span>
              </button>
              
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200 relative"
              >
                <span className="text-2xl mb-1">🔗</span>
                <span className="text-sm font-medium text-gray-700">Copy Link</span>
                {copySuccess && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Link disalin!
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
            © STIBA Makassar
          </div>
        </div>
      </nav>
    </div>
  );
}

export default CampaignPage;