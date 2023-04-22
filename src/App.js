import { useState } from 'react';
import { handleInputChange, refCallback } from './utils/component-handler.ts';
import html2canvas from 'html2canvas';
import inLogo from './images/in-logo.png'
import imageTemplate from './images/template.jpg'
import './App.css';

function App() {  
  const [name, setName] = useState('')
  const [additionalText, setAdditionalText] = useState('')
  const [pregeneratedImage, setPregeneratedImage] = useState(null)
  const imageSize = 1000

  const handleDownloadImage = () => {
    if (pregeneratedImage != null) {
      const scaleSize = imageSize / pregeneratedImage.offsetWidth

      html2canvas(pregeneratedImage, { scale: scaleSize }).then(canvas => {
        const a = document.createElement('a')
        a.href = canvas.toDataURL("image/jpeg", 2)
        a.download = 'twibbin.jpg'
        a.click()
      })
    }
  }

  return (
    <div className="overflow-x-hidden">
      <nav>
        <div className="header w-full sticky w top-0 left-0 right-0 z-[99] h-12 p-4 py-7 flex items-center font-ysabeau font-medium text-xl lg:text-2xl text-gray-500">
          <span className="mr-2 inline-block w-[1.6rem] lg:w-[2rem]"><img className="h-full w-full" src={inLogo} alt="In Logo"/></span> Twibbin
        </div>
        <div className="flex flex-col items-center pt-10 w-full min-h-screen pb-12 bg-[#f2fdf5]">
          <div className="bg-white w-[18rem] md:w-[28rem] lg:w-[35rem] drop-shadow-lg rounded-lg overflow-hidden">
            <div className="image-container">
              <div ref={(element) => refCallback(element, setPregeneratedImage)}  className="w-full relative">
                <img src={imageTemplate} alt="Template"/>
                <div className="absolute h-[3rem] md:h-[4.1rem] lg:h-[5.1rem] w-full bottom-0 left-0 right-0 flex justify-center">
                  <div className="block font-monsterrat text-center leading-[0.45rem] md:leading-[0.75rem] lg:leading-[0.95rem] text-[#444444]">
                    <span className="font-bold text-[0.48rem] md:text-[0.72rem] lg:text-[0.92rem]">{name}</span><br/>
                    <span className="font-medium text-[0.42rem] md:text-[0.65rem] lg:text-[0.82rem]">{additionalText}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 px-4 pb-4">
              <input 
                className="w-full block font-roboto p-2 px-4 border border-[#5e5e5e] rounded-xl mb-2" 
                type="text" 
                placeholder="Nama" 
                value={name} onChange={(e) => handleInputChange(e, setName, 25)}
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
            </div>
          </div>
          <div className="mt-8 text-base md:text-lg font-ysabeau text-[#8f8f8f]">
            Dibuat dengan Twibbin
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
