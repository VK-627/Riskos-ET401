import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Link } from "react-router-dom";
import Img1 from '../assets/img1.jpg';
import Img2 from '../assets/img2.jpg';
import Img3 from "../assets/img3.png";
import Img4 from "../assets/land2.png";
import Img5 from "../assets/land1.png";


function LandingPage() {
  return (
    <div className="bg-[#ffffff] min-h-screen text-black font-sans">
      
      {/* Hero Section */}
      <section className="relative w-full h-[500px] overflow-hidden">
        
        {/* Carousel as background */}
        <Carousel
          autoPlay
          infiniteLoop
          showThumbs={false}
          showStatus={false}
          interval={2000}
          className="h-full"
        >
          <div>
            <img src={Img1} alt="Stock Market" className="object-cover w-full h-[500px]" />
          </div>
          <div>
            <img src={Img2} alt="Skyscrapers" className="object-cover w-full h-[500px]" />
          </div>
          <div>
            <img src={Img3} alt="Digital Documents" className="object-cover w-full h-[500px]" />
          </div>
        </Carousel>

        {/* Teal content overlay */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center">
          <div className="bg-teal-900 bg-opacity-70 relative w-full h-[500px] overflow-hidden flex items-center justify-center">
            <div className="flex flex-col items-center text-center text-white">
              <h1 className="text-6xl font-extrabold leading-tight mb-4">
              RISKOS<br />Do Better.
              </h1>
              <ul className="space-y-2 text-lg mb-10">
                <li>Better Investments for a better future</li>
              </ul>
            </div>
          </div>
        </div>  

      </section>

      {/* Info Section */}
      <section className="w-11/12 max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Make Investments Easy.<br />Smarter, Faster, Better.
          </h1>
          <p className="mt-4 text-md text-gray-600">
            Access real-time stock price data of all Nifty-50 listed companies at your fingertips.
          </p>
          <Link to="/learn">
            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition duration-300">
              Learn More ➜
            </button>
          </Link> 
        </div>
        <div className="flex justify-center">
          <img src={Img5} alt="Stock Market" className="h-120 object-contain mx-auto" />
        </div>
      </section>

      {/* Signup Section */}
      <section className="w-full mt-20 bg-teal-200 py-16">
        <div className="w-11/12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          <div className="flex justify-center">
            <img src= {Img4} alt="Free Signup" className="h-80 object-contain mx-auto" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              No fuss. Free Sign Up.<br />No credit card needed.
            </h3>
            <p className="mt-4 text-md text-gray-600">
              Get started for free and explore our real-time investment insights without any commitment.
            </p>
            <Link to="/signup">
              <button className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition duration-300">
                Sign up for free ➜
              </button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

export { LandingPage };
