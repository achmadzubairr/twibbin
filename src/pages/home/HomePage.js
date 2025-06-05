import { useState, useEffect } from 'react';
import inLogo from '../../images/in-logo.png';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../../services/campaignService';

function HomePage() {  
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    // Load active campaigns
    const loadCampaigns = async () => {
      try {
        const campaignsData = await getCampaigns();
        const activeCampaigns = campaignsData.filter(c => c.isActive);
        setCampaigns(activeCampaigns);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      }
    };

    loadCampaigns();
  }, []);

  return (
    <div className="overflow-x-hidden">
      <nav>
        <div className="header w-full sticky w top-0 left-0 right-0 z-[99] h-12 p-4 py-7 flex items-center justify-between font-ysabeau font-medium text-xl lg:text-2xl text-gray-500">
          <div className="flex items-center">
            <span className="mr-2 inline-block w-[1.6rem] lg:w-[2rem]"><img className="h-full w-full" src={inLogo} alt="In Logo"/></span>STIBA Makassar
          </div>
          <Link to="/admin" className="text-base text-gray-500 hover:text-gray-700">Admin</Link>
        </div>
        <div className="flex flex-col items-center pt-10 w-full min-h-screen pb-12 bg-[#f2fdf5]">
          {/* Campaign Section */}
          {campaigns.length > 0 ? (
            <div className="w-[18rem] md:w-[28rem] lg:w-[35rem]">
              <h2 className="text-2xl lg:text-3xl font-bold text-center mb-8 text-gray-800">Pilih Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/${campaign.slug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={campaign.templateUrl}
                      alt={campaign.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 text-base">{campaign.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Klik untuk menggunakan template ini</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">Belum Ada Template</h2>
              <p className="text-gray-600">Template sedang dalam persiapan</p>
            </div>
          )}

          <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
            © STIBA Makassar
          </div>
        </div>
      </nav>
    </div>
  );
}

export default HomePage;