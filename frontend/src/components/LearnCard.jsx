import React, { useState } from "react";
import Img1 from "../assets/report.png";
import Img2 from "../assets/money.png";
import Img3 from "../assets/stock.png";

const cards = [
  {
    title: "VaR",
    detailedDesc: "Value at Risk (VaR) is a widely used measure to estimate the potential loss in the value of a stock or portfolio over a specific time period, under normal market conditions, at a given confidence level. For example, a one-day VaR of $1 million at 95% confidence means there is a 5% chance the portfolio will lose more than $1 million in one day. It helps investors understand the worst expected loss without extreme events. VaR can be calculated using historical simulation, variance-covariance methods, or Monte Carlo simulations, making it crucial for managing financial risk.",
    bgColor: "bg-yellow-200",
    icon: Img1
  },
  {
    title: "C-VaR",
    detailedDesc: "Conditional Value at Risk (CVaR), also called Expected Shortfall, provides a deeper view beyond VaR by estimating the average losses that occur beyond the VaR threshold. While VaR tells you the worst expected loss at a confidence level, CVaR tells you how bad losses can get if that worst case is breached. It is especially useful in stock risk analysis because it captures tail risk — extreme losses that VaR might miss. CVaR is more sensitive to the shape of the loss distribution, making it a better risk management tool when dealing with portfolios exposed to large, rare losses.",
    bgColor: "bg-green-300",
    icon: Img2
  },
  {
    title: "Sharpe Ratio",
    detailedDesc: "The Sharpe Ratio measures how well a stock or portfolio compensates an investor for the risk taken. It is calculated by subtracting the risk-free rate (like government bond returns) from the portfolio’s return, and then dividing by the portfolio’s standard deviation (risk). A higher Sharpe Ratio indicates better risk-adjusted returns. For example, if two portfolios have the same return, but one is less volatile, it will have a higher Sharpe Ratio and is considered better. In stock risk calculation, Sharpe Ratio helps investors compare investments not just based on returns, but on how much risk was taken to achieve them.",
    bgColor: "bg-pink-300",
    icon: Img3
  },
];

const LearnMoreCards = () => {
  const [expandedCard, setExpandedCard] = useState(null);

  const toggleExpand = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-10">
      {/* Heading */}
      <h1 className="text-4xl font-bold mb-10 text-white bg-teal-700 w-full py-6 text-center shadow-md">
        LEARN MORE
      </h1>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 flex space-x-4 border-b">
        {cards.map((card, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Main Card */}
            <div
              className={`w-80 rounded-md p-20 ${card.bgColor} flex flex-col items-center cursor-pointer transition-transform transform hover:scale-105`}
              onClick={() => toggleExpand(index)}
            >
              {/* Icon */}
              <img src={card.icon} alt={card.title} className="w-20 h-20 mb-4" />
              
              {/* Title */}
              <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
              
              {/* Arrow Icon */}
              <div className="text-2xl mb-2">{expandedCard === index ? "⌃" : "⌄"}</div>
              
              {/* Short description */}
              <p className="text-black text-center">{card.shortDesc}</p>
            </div>

            {/* Expanded Description */}
            {expandedCard === index && (
              <div className="w-80 mt-2 bg-gray-100 p-6 rounded-md shadow-inner transition-all duration-300">
                <p className="text-gray-700 text-lg">{card.detailedDesc}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { LearnMoreCards };
