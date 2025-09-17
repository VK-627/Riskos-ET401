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
import { StockTooltip } from './StockTooltip';

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

  // FIXED: Use correct keys from your backend
  const riskMetrics = [
    { name: 'VaR', value: Math.abs(portfolio['VaR (₹)'] || 0) },
    { name: 'CVaR', value: Math.abs(portfolio['CVaR (₹)'] || 0) },
    { name: 'Max Drawdown', value: Math.abs(portfolio['Max Drawdown'] || 0) * 100 }
  ];

  const portfolioValue = portfolio['Total Portfolio Value (₹)'] || 0;
  const totalVar = Math.abs(portfolio['VaR (₹)'] || 0);
  const totalCvar = Math.abs(portfolio['CVaR (₹)'] || 0);
  const sharpeRatio = portfolio['Sharpe Ratio'] || 0;
  const maxDrawdown = Math.abs(portfolio['Max Drawdown'] || 0);

  // Determine risk level based on actual data
  const getRiskLevel = () => {
    if (sharpeRatio > 0.3 && maxDrawdown < 0.2) return 'Low';
    if (sharpeRatio > 0.1 && maxDrawdown < 0.45) return 'Moderate';
    return 'High';
  };

  return (
    <div className="space-y-6">

      {/* Positions summary with live price and per-stock tooltip */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Positions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Stock</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Buy Price (₹)</th>
                <th className="p-2">Current Price (₹)</th>
                <th className="p-2">Info</th>
              </tr>
            </thead>
            <tbody>
              {basePositions.map((p, idx) => {
                const indiv = individual[p.name] || individual[`${p.base}.NS`] || individual[p.base] || {};
                const tooltipStock = {
                  name: p.base,
                  'Value at Risk (VaR)': Math.abs(indiv['VaR (₹)'] || 0),
                  'Conditional VaR (CVaR)': Math.abs(indiv['CVaR (₹)'] || 0),
                  'Sharpe Ratio': indiv['Sharpe Ratio'] || 0,
                  'Maximum Drawdown': Math.abs(indiv['Max Drawdown'] || 0) * 100,
                };
                const cp = livePrices[p.key];
                const [show, setShow] = React.useState(false);
                return (
                  <tr key={`${p.key}-${idx}`} className="border-t">
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2">{p.quantity}</td>
                    <td className="p-2">{formatCurrency(p.buyPrice)}</td>
                    <td className="p-2">{cp ? formatCurrency(cp) : '—'}</td>
                    <td className="p-2">
                      <div className="relative inline-block">
                        <button
                          aria-label="Stock risk info"
                          onMouseEnter={() => setShow(true)}
                          onMouseLeave={() => setShow(false)}
                          className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center hover:bg-yellow-200"
                        >
                          !
                        </button>
                        {show && (
                          <div className="absolute z-10 mt-2 left-0">
                            <StockTooltip stock={tooltipStock} />
                          </div>
                        )}
                      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Total Value</h4>
          <p className="text-2xl font-bold">{formatCurrency(portfolioValue)}</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Value at Risk</h4>
          <p className="text-2xl font-bold">{formatCurrency(totalVar)}</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Conditional VaR</h4>
          <p className="text-2xl font-bold">{formatCurrency(totalCvar)}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Sharpe Ratio</h4>
          <p className="text-2xl font-bold">{sharpeRatio.toFixed(3)}</p>
        </div>
      </div>
    </div>
  );
};

export { AdvancedRiskCharts };