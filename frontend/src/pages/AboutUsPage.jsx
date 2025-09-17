import React from 'react';

import img5 from "../assets/img5.jpg";
import img6 from "../assets/img6.jpg";
import img7 from "../assets/img7.jpg";
import img8 from "../assets/img8.jpg"

const AboutUsPage = () => {
  return (
    <div className="bg-[#ffffff] min-h-screen text-black font-sans">
      {/* Top Teal Section */}
      <div className="bg-teal-900 text-white py-20 text-center">
        <h1 className="text-4xl font-extrabold">About Us</h1>
      </div>

      {/* About Text Section */}
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-700 text-lg">
          At Riskos, we believe in doing better — better solutions, better experiences, and better future. 
          Our mission is to create tools and technologies that make people's lives easier, safer, and more connected.
        </p>
      </div>

      {/* Meet the Developers Heading */}
      <div className="bg-teal-100 py-12">
        <h2 className="text-3xl font-semibold text-center text-teal-900">Meet the Developers</h2>
      </div>

      {/* Developers Section */}
      <div className="max-w-6xl mx-auto py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10 px-4">
        {/* Developer 1 */}
        <div className="flex flex-col items-center text-center transition-transform transform hover:rotate-[-3deg] hover:scale-105 duration-300">
          <img src={img8} alt="Developer 1" className="w-32 h-32 object-cover rounded-full mb-4" />
          <h3 className="text-xl font-semibold">Vishwas</h3>
          <p className="text-gray-600 mt-2">Haa btao kisko kya dikkat hai.</p>
        </div>

        {/* Developer 2 */}
        <div className="flex flex-col items-center text-center transition-transform transform hover:rotate-[-3deg] hover:scale-105 duration-300">
          <img src={img5} alt="Developer 2" className="w-32 h-32 object-cover rounded-full mb-4" />
          <h3 className="text-xl font-semibold">Humaira Khan</h3>
          <p className="text-gray-600 mt-2">Karna kya hai</p>
        </div>

        {/* Developer 3 */}
        <div className="flex flex-col items-center text-center transition-transform transform hover:rotate-[-3deg] hover:scale-105 duration-300">
          <img src={img6} alt="Developer 3" className="w-32 h-32 object-cover rounded-full mb-4" />
          <h3 className="text-xl font-semibold">Ankita</h3>
          <p className="text-gray-600 mt-2">Jaldi karo</p>
        </div>

        {/* Developer 4 */}
        <div className="flex flex-col items-center text-center transition-transform transform hover:rotate-[-3deg] hover:scale-105 duration-300">
          <img src={img7} alt="Developer 4" className="w-32 h-32 object-cover rounded-full mb-4" />
          <h3 className="text-xl font-semibold">Aastha</h3>
          <p className="text-gray-600 mt-2">Landing page acha sa banana h</p>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;
