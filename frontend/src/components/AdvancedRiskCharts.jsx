import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { StockRow } from './StockRow';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb'];

const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
};

const formatPercent = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return "0%";
  return `${Number(value).toFixed(2)}%`;
};

const RiskGauge = ({ value, max, title, color = "#8884d8" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{formatPercent(percentage)}</span>
        </div>
      </div>
      <p className="text-sm font-medium mt-2">{title}</p>
    </div>
  );
};

const AdvancedRiskCharts = ({ result, inputSummary = [] }) => {
  if (!result) return null;

  // FIXED: Use the actual keys from your backend response
  const portfolio = result.portfolio_summary || {};
  const individual = result.individual_stocks || {};

  // Build positions list from user input and enrich with live prices
  const [livePrices, setLivePrices] = useState({});
  const basePositions = (inputSummary || []).map((s) => {
    const symbol = (s.stockName || '').toUpperCase();
    const base = symbol.replace('.NS', '');
    return {
      key: symbol,
      base,
      name: symbol,
      quantity: Number(s.quantity || 0),
      buyPrice: Number(s.buyPrice || 0)
    };
  });

  useEffect(() => {
    let isCancelled = false;
    const fetchAll = async () => {
      for (const p of basePositions) {
        try {
          const res = await fetch(`/api/market/price/${p.base}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!isCancelled) {
            setLivePrices((prev) => ({ ...prev, [p.key]: Number(data.price || 0) }));
          }
        } catch {
          // ignore per-row failures
        }
      }
    };
    fetchAll();
    return () => { isCancelled = true; };
  }, [inputSummary]);

  // FIXED: Extract data using the correct keys from your backend
  const stockData = Object.entries(individual).map(([name, data]) => {
    // Find matching input data for position value calculation
    const inputStock = inputSummary.find(stock => 
      stock.stockName === name || 
      stock.stockName === name.replace('.NS', '') ||
      `${stock.stockName}.NS` === name
    );
    
    const quantity = parseFloat(inputStock?.quantity || 0);
    const buyPrice = parseFloat(inputStock?.buyPrice || 0);
    const positionValue = quantity * buyPrice;

    return {
      name: name.replace('.NS', ''),
      value: positionValue,
      var: Math.abs(data['VaR (₹)'] || 0),
      cvar: Math.abs(data['CVaR (₹)'] || 0),
      sharpe: data['Sharpe Ratio'] || 0,
      profitLoss: positionValue * 0.05, // Placeholder calculation
      roi: 5, // Placeholder
      weight: (positionValue / (portfolio['Total Portfolio Value (₹)'] || 40000)) * 100,
      maxDrawdown: Math.abs(data['Max Drawdown'] || 0) * 100
    };
  });

  // FIXED: Use correct keys from your backend (removed Max Drawdown)
  const riskMetrics = [
    { name: 'VaR', value: Math.abs(portfolio['VaR (₹)'] || 0) },
    { name: 'CVaR', value: Math.abs(portfolio['CVaR (₹)'] || 0) }
  ];

  const portfolioValue = portfolio['Total Portfolio Value (₹)'] || 0;
  const totalVar = Math.abs(portfolio['VaR (₹)'] || 0);
  const totalCvar = Math.abs(portfolio['CVaR (₹)'] || 0);
  const sharpeRatio = portfolio['Sharpe Ratio'] || 0;
  const maxDrawdown = Math.abs(portfolio['Max Drawdown'] || 0);
  
  // Calculate current portfolio value using live prices
  const currentPortfolioValue = basePositions.reduce((total, position) => {
    const livePrice = livePrices[position.key];
    return total + (position.quantity * (livePrice || position.buyPrice));
  }, 0);
  
  const totalInvestedValue = basePositions.reduce((total, position) => {
    return total + (position.quantity * position.buyPrice);
  }, 0);
  
  const totalProfitLoss = currentPortfolioValue - totalInvestedValue;

  // Determine risk level based on actual data
  const getRiskLevel = () => {
    if (sharpeRatio > 0.3 && maxDrawdown < 0.2) return 'Low';
    if (sharpeRatio > 0.1 && maxDrawdown < 0.45) return 'Moderate';
    return 'High';
  };

  return (
    <div className="space-y-6">

      {/* Individual Stock Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Individual Stock Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="p-2">Stock</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Buy Price</th>
                <th className="p-2">Current Price</th>
                <th className="p-2">Invested Value</th>
                <th className="p-2">Current Value</th>
                <th className="p-2">P/L</th>
                <th className="p-2">P/L %</th>
              </tr>
            </thead>
            <tbody>
              {basePositions.map((position, index) => {
                const livePrice = livePrices[position.key] || position.buyPrice;
                const investedValue = position.quantity * position.buyPrice;
                const currentValue = position.quantity * livePrice;
                const profitLoss = currentValue - investedValue;
                const profitLossPercent = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
                
                return (
                  <tr key={`perf-${position.key}-${index}`} className="border-b">
                    <td className="p-2 font-medium">{position.name}</td>
                    <td className="p-2">{position.quantity}</td>
                    <td className="p-2">{formatCurrency(position.buyPrice)}</td>
                    <td className="p-2">{formatCurrency(livePrice)}</td>
                    <td className="p-2">{formatCurrency(investedValue)}</td>
                    <td className="p-2">{formatCurrency(currentValue)}</td>
                    <td className={`p-2 ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitLoss)}
                    </td>
                    <td className={`p-2 ${profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitLossPercent.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Risk Overview Gauges */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Risk Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <RiskGauge 
            value={totalVar} 
            max={portfolioValue * 0.1} 
            title="Value at Risk" 
            color="#ef4444" 
          />
          <RiskGauge 
            value={totalCvar} 
            max={portfolioValue * 0.15} 
            title="Conditional VaR" 
            color="#f97316" 
          />
          <RiskGauge 
            value={sharpeRatio} 
            max={2} 
            title="Sharpe Ratio" 
            color={sharpeRatio > 1 ? "#22c55e" : sharpeRatio > 0.5 ? "#eab308" : "#ef4444"} 
          />
          <div className="flex flex-col items-center justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              getRiskLevel() === 'Low' ? 'bg-green-500' :
              getRiskLevel() === 'Moderate' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {getRiskLevel().charAt(0)}
            </div>
            <p className="text-sm font-medium mt-2">Risk Level</p>
          </div>
        </div>
      </div>

      {/* Allocation and distribution sections removed as requested */}

      {/* Risk Metrics Comparison */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Risk Metrics Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={riskMetrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value, name) => [
              name === 'Max Drawdown' ? `${value.toFixed(2)}%` : formatCurrency(value),
              name
            ]} />
            <Bar dataKey="value" fill="#8dd1e1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Invested Value</h4>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvestedValue)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Current Value</h4>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentPortfolioValue)}</p>
          </div>
          <div className={`p-4 rounded-lg border ${totalProfitLoss >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Total Profit/Loss</h4>
            <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfitLoss)}
            </p>
            <p className={`text-sm ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalInvestedValue > 0 ? `${((totalProfitLoss / totalInvestedValue) * 100).toFixed(2)}%` : '0.00%'}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Value at Risk</h4>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVar)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Conditional VaR</h4>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCvar)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Sharpe Ratio</h4>
            <p className="text-2xl font-bold text-gray-900">{sharpeRatio.toFixed(3)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdvancedRiskCharts };