import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { handleInputChange, refCallback } from '../../utils/component-handler.ts';
import html2canvas from 'html2canvas';
import inLogo from '../../images/in-logo.png';
import defaultTemplate from '../../images/template.jpg';
import { Link } from 'react-router-dom';
import { getCampaignBySlug } from '../../services/supabaseCampaignService';
import { trackDownload } from '../../services/downloadService';
import { createCircularImage, validateImageFile, overlayImageOnTemplate, createCustomPositionedImage } from '../../utils/imageProcessor';
import PhotoEditor from '../../components/PhotoEditor';
import '../../../src/components/PhotoEditor.css';

function CampaignPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [pregeneratedImage, setPregeneratedImage] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Photo campaign states
  const [userPhoto, setUserPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoPosition, setPhotoPosition] = useState({ x: 50, y: 50, size: 30, scale: 1 });
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const updateTimeoutRef = useRef(null);
  
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

    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [slug]);

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
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      // Show photo editor
      setShowPhotoEditor(true);

      // Generate initial processed image with default position
      await updateProcessedImage(file, photoPosition);
    } catch (error) {
      console.error('Error processing photo:', error);
      setUploadError('Gagal memproses foto. Coba lagi.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const updateProcessedImage = async (photo = userPhoto, position = photoPosition) => {
    if (!photo || !campaign) return;

    try {
      setIsUpdatingImage(true);
      const finalImage = await createCustomPositionedImage(
        campaign.template_url,
        photo,
        position,
        1000,
        1000
      );
      setProcessedImage(finalImage);
    } catch (error) {
      console.error('Error updating processed image:', error);
      setUploadError('Gagal memproses foto. Coba lagi.');
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handlePositionChange = async (newPosition) => {
    setPhotoPosition(newPosition);
    await updateProcessedImage(userPhoto, newPosition);
  };

  const handleSizeChange = async (newSize) => {
    const newPosition = { ...photoPosition, size: newSize };
    setPhotoPosition(newPosition);
    await updateProcessedImage(userPhoto, newPosition);
  };

  const handleScaleChange = async (newScale) => {
    const newPosition = { ...photoPosition, scale: newScale };
    setPhotoPosition(newPosition);
    await updateProcessedImage(userPhoto, newPosition);
  };

  const handleResetPosition = async () => {
    const resetPosition = { x: 50, y: 50, size: 30, scale: 1 };
    setPhotoPosition(resetPosition);
    await updateProcessedImage(userPhoto, resetPosition);
  };

  const cleanNameForFilename = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .substring(0, 20); // Limit to 20 characters
  };

  const handleDownloadImage = async () => {
    // Photo campaign download
    if (campaign?.campaign_type === 'photo' && processedImage) {
      try {
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

        // Download the processed image
        const a = document.createElement('a');
        a.href = processedImage;
        const fallbackFilename = `${campaign.slug}_photo_${generateRandomId()}.jpg`;
        a.download = trackResult.filename || fallbackFilename;
        a.click();
      } catch (error) {
        console.error('Error downloading processed image:', error);
        alert('Gagal mengunduh gambar. Coba lagi.');
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
                    <div className="w-full" style={{ aspectRatio: '1/1' }}>
                      <PhotoEditor
                        templateUrl={campaign.template_url}
                        userPhoto={userPhoto}
                        onPositionChange={handlePositionChange}
                        initialPosition={photoPosition}
                        currentPosition={photoPosition}
                      />
                    </div>
                  ) : processedImage ? (
                    // Show final processed image
                    <img src={processedImage} alt="Preview with your photo" className="w-full" />
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
                            setPhotoPreview(null);
                            setProcessedImage(null);
                            setPhotoPosition({ x: 50, y: 50, size: 30, scale: 1 });
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Ganti Foto
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-600 text-center mb-4">
                        <p>💡 Drag foto di atas untuk mengubah posisi</p>
                      </div>

                      {/* Photo Controls */}
                      <div className="space-y-4">
                        {/* Size Control */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Ukuran Foto: {photoPosition.size}%
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="80"
                            value={photoPosition.size}
                            onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>

                        {/* Scale Control */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Zoom Foto: {(photoPosition.scale * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={photoPosition.scale}
                            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>

                        {/* Reset Button */}
                        <button
                          onClick={handleResetPosition}
                          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                          Reset ke Tengah
                        </button>
                      </div>
                      
                      {isUpdatingImage && (
                        <div className="flex items-center justify-center py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14eb99] mr-2"></div>
                          <span className="text-sm text-gray-600">Mengupdate preview...</span>
                        </div>
                      )}

                      <button 
                        disabled={!processedImage || isUpdatingImage} 
                        className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]" 
                        onClick={handleDownloadImage}>
                        {isUpdatingImage ? 'Memproses...' : processedImage ? 'Unduh Gambar' : 'Memproses...'}
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
          <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
            © STIBA Makassar
          </div>
        </div>
      </nav>
    </div>
  );
}

export default CampaignPage;