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
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const imageSize = 1000;

  // Global touch event handler to prevent unwanted tab opens
  useEffect(() => {
    const handleGlobalTouch = (e) => {
      // Prevent multiple rapid touches that might trigger window.open
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('touchstart', handleGlobalTouch, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleGlobalTouch);
    };
  }, []);

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
      document.title = `Twibbin | Buat custom kartu ucapan`;
      
      // Set meta description - sama dengan text sharing
      const description = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin!`;
      
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

      // Add cache busting timestamp untuk meta tags
      const timestamp = Date.now();
      const imageUrlWithCache = `${campaign.template_url}?v=${timestamp}`;

      updateMetaTag('description', description);
      updateMetaTag('og:title', `Twibbin | Buat custom kartu ucapan`);
      updateMetaTag('og:description', description);
      updateMetaTag('og:image', imageUrlWithCache);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:image:type', 'image/jpeg');
      updateMetaTag('og:url', window.location.href);
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:site_name', 'Twibbin');
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `Twibbin | Buat custom kartu ucapan`);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', imageUrlWithCache);
      updateMetaTag('twitter:image:alt', `Template ${campaign.name}`);
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

  const handleShareWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add debounce protection against rapid clicks
    const now = Date.now();
    if (window.lastShareClick && now - window.lastShareClick < 1000) {
      return;
    }
    window.lastShareClick = now;
    
    const currentUrl = window.location.href;
    const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
    const text = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin! ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    // Use setTimeout to prevent immediate execution from touch events
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 100);
  };

  const handleShareFacebook = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add debounce protection against rapid clicks
    const now = Date.now();
    if (window.lastShareClick && now - window.lastShareClick < 1000) {
      return;
    }
    window.lastShareClick = now;
    
    const currentUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    
    // Use setTimeout to prevent immediate execution from touch events
    setTimeout(() => {
      window.open(facebookUrl, '_blank');
    }, 100);
  };

  const handleShareTwitter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add debounce protection against rapid clicks
    const now = Date.now();
    if (window.lastShareClick && now - window.lastShareClick < 1000) {
      return;
    }
    window.lastShareClick = now;
    
    const currentUrl = window.location.href;
    const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
    const text = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`;
    
    // Use setTimeout to prevent immediate execution from touch events
    setTimeout(() => {
      window.open(twitterUrl, '_blank');
    }, 100);
  };

  const handleShareTelegram = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add debounce protection against rapid clicks
    const now = Date.now();
    if (window.lastShareClick && now - window.lastShareClick < 1000) {
      return;
    }
    window.lastShareClick = now;
    
    const currentUrl = window.location.href;
    const campaignType = campaign.campaign_type === 'photo' ? 'foto' : 'nama';
    const text = `Buat kartu ucapan ${campaign.name} yang disesuaikan dengan ${campaignType} anda di Twibbin! ${currentUrl}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(text)}`;
    
    // Use setTimeout to prevent immediate execution from touch events
    setTimeout(() => {
      window.open(telegramUrl, '_blank');
    }, 100);
  };

  const handleShareInstagram = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add debounce protection against rapid clicks
    const now = Date.now();
    if (window.lastShareClick && now - window.lastShareClick < 1000) {
      return;
    }
    window.lastShareClick = now;
    
    // Instagram doesn't have direct URL sharing like others
    // Copy link and inform user to paste in Instagram
    const currentUrl = window.location.href;
    
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link disalin! Paste di Instagram Stories atau DM untuk membagikan.');
      } catch (error) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert('Link disalin! Paste di Instagram Stories atau DM untuk membagikan.');
        } catch (fallbackError) {
          alert('Silakan salin link ini untuk dibagikan di Instagram: ' + currentUrl);
        }
        document.body.removeChild(textArea);
      }
    }, 100);
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
    <div className="overflow-x-hidden min-h-screen bg-[#f2fdf5]">
      <nav className="header w-full sticky top-0 left-0 right-0 z-[99] px-4 py-4 flex items-center justify-between font-ysabeau font-medium text-xl lg:text-2xl text-gray-500 bg-[#f2fdf5]">
        <div className="flex items-center">
          <span className="mr-2 inline-block w-[1.6rem] lg:w-[2rem]"><img className="h-full w-full" src={inLogo} alt="In Logo"/></span>STIBA Makassar
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-base text-gray-500 hover:text-gray-700">Beranda</Link>
          <Link to="/admin" className="text-base text-gray-500 hover:text-gray-700">Admin</Link>
        </div>
      </nav>
      
      <div className="flex flex-col items-center pt-6 pb-8 px-4">
          <div className="bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg">
            <div className="image-container overflow-hidden">
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownloadImage();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        style={{ touchAction: 'manipulation' }}>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownloadImage();
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    style={{ touchAction: 'manipulation' }}>
                    Unduh
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mt-6 bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">Bagikan</h3>
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-[#25D366] hover:bg-[#20bd5a] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">WhatsApp</span>
              </div>
              
              {/* 2. Telegram */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleShareTelegram}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-[#0088CC] hover:bg-[#0077bb] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">Telegram</span>
              </div>
              
              {/* 3. Facebook */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleShareFacebook}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-[#1877F2] hover:bg-[#1565d8] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">Facebook</span>
              </div>
              
              {/* 4. Instagram */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleShareInstagram}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:from-[#7529a3] hover:via-[#e41a1a] hover:to-[#e3a73e] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">Instagram</span>
              </div>
              
              {/* 5. X (Twitter) */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleShareTwitter}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.80l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">X (Twitter)</span>
              </div>
              
              {/* 6. Copy Link */}
              <div className="flex flex-col items-center gap-2 relative">
                <button
                  onClick={handleCopyLink}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full bg-gray-500 hover:bg-gray-600 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 text-center">Copy Link</span>
                {copySuccess && (
                  <span className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Link disalin!
                  </span>
                )}
              </div>
            </div>
          </div>

        <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
          © STIBA Makassar
        </div>
      </div>
    </div>
  );
}

export default CampaignPage;