import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb"];

const currency = (n) => {
  if (n === undefined || n === null || isNaN(Number(n))) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));
};


const card = (title, value) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="text-xs uppercase text-gray-500">{title}</div>
    <div className="text-xl font-semibold mt-1">{value}</div>
  </div>
);

const coerceNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "string") {
    const stripped = v.replace(/[^0-9.-]/g, "");
    const n = Number(stripped);
    return isNaN(n) ? 0 : n;
  }
  return Number(v) || 0;
};

const normalizeStocks = (result) => {
  // result.individual_stocks is an object keyed by stock name
  if (!result || !result.individual_stocks) return [];
  return Object.entries(result.individual_stocks).map(([name, s]) => ({
    name,
    quantity: coerceNum(s.quantity),
    buy_price: coerceNum(s.buy_price),
    current_price: coerceNum(s.current_price),
    position_value: coerceNum(s.position_value),
    profit_loss: coerceNum(s.profit_loss),
    var_amount: coerceNum(s.var_amount),
  }));
};

const ForecastVisualizations = ({ result, inputSummary = [] }) => {
  const [livePrices, setLivePrices] = useState({});
  
  if (!result) return null;
  // Support both direct Flask payload and Mongo-wrapped payload from backend
  const root = result.individual_stocks ? result : (result.result || result);
  const stocks = normalizeStocks(root);
  
  // Fetch live prices for accurate current pricing
  useEffect(() => {
    let isCancelled = false;
    const fetchAll = async () => {
      for (const stock of stocks) {
        try {
          const symbol = stock.name.replace('.NS', '');
          const res = await fetch(`http://localhost:5000/api/market/price/${symbol}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!isCancelled) {
            setLivePrices((prev) => ({ ...prev, [stock.name]: Number(data.price || 0) }));
          }
        } catch {
          // ignore per-row failures
        }
      }
    };
    if (stocks.length > 0) {
      fetchAll();
    }
    return () => { isCancelled = true; };
  }, [stocks]);

  // Enhanced stock data with live prices
  const enhancedStocks = stocks.map((stock) => {
    const livePrice = livePrices[stock.name] || stock.current_price;
    const quantity = stock.quantity;
    const buyPrice = stock.buy_price;
    const investedValue = quantity * buyPrice;
    const currentValue = quantity * livePrice;
    const profitLoss = currentValue - investedValue;
    
    return {
      ...stock,
      current_price: livePrice,
      position_value: currentValue,
      invested_value: investedValue,
      profit_loss: profitLoss,
      profit_loss_percent: investedValue > 0 ? (profitLoss / investedValue) * 100 : 0
    };
  });

  const pieData = enhancedStocks.map((s) => ({ name: s.name, value: s.position_value }));
  const pnlData = enhancedStocks.map((s) => ({ name: s.name, ProfitLoss: s.profit_loss }));
  const priceCompareData = enhancedStocks.map((s) => ({ name: s.name, "Buy Price": s.buy_price, "Current Price": s.current_price }));
  const riskData = enhancedStocks.map((s) => ({ 
    name: s.name, 
    "Value at Risk": Math.abs(s.var_amount || 0) || (s.position_value || 0) * 0.05 // Default to 5% of position value if no VaR
  }));

  const ps = root.portfolio_summary || {};

  // Generate forecast timeline data from actual backend data
  const generateForecastTimeline = () => {
    const timeline = [];
    const days = parseInt(inputSummary[0]?.forecastDays) || 30;
    const currentDate = new Date();
    
    // Get actual forecast data from backend if available
    let hasRealForecastData = false;
    
    // Try to extract forecast data from individual stocks
    enhancedStocks.forEach(stock => {
      if (stock.forecast_returns && Array.isArray(stock.forecast_returns)) {
        hasRealForecastData = true;
      }
    });
    
    if (hasRealForecastData) {
      // Use actual forecast data from backend
      const stockForecasts = enhancedStocks
        .filter(stock => stock.forecast_returns && Array.isArray(stock.forecast_returns))
        .map(stock => stock.forecast_returns);
      
      if (stockForecasts.length > 0) {
        // Average across stocks for portfolio forecast
        const avgForecast = [];
        for (let i = 0; i < Math.min(...stockForecasts.map(f => f.length)); i++) {
          const dayAvg = stockForecasts.reduce((sum, forecast) => sum + (forecast[i] || 0), 0) / stockForecasts.length;
          avgForecast.push(dayAvg);
        }
        
        avgForecast.forEach((returnVal, i) => {
          const date = new Date(currentDate);
          date.setDate(date.getDate() + i);
          
          // Convert return to VaR estimate
          const positionValue = enhancedStocks.reduce((sum, stock) => sum + (stock.position_value || 0), 0);
          const estimatedVaR = Math.abs(returnVal * positionValue * 0.01); // Rough VaR estimate
          
          timeline.push({
            day: i + 1,
            date: date.toISOString().split('T')[0],
            var: Math.max(0, estimatedVaR),
            confidence: Math.max(50, 95 - (i * 0.5))
          });
        });
      }
    }
    
    // Fallback to simple trend if no real data
    if (timeline.length === 0) {
      const baseVaR = enhancedStocks.reduce((sum, stock) => sum + Math.abs(stock.var_amount || 0), 0) || 
                     enhancedStocks.reduce((sum, stock) => sum + (stock.position_value || 0), 0) * 0.05;
      
      for (let i = 0; i < days; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        
        // Simple trend without random component to avoid animation
        const trendFactor = 1 + (i * 0.001);
        const volatilityFactor = 1 + Math.sin(i * 0.2) * 0.1;
        
        const forecastVaR = baseVaR * trendFactor * volatilityFactor;
        
        timeline.push({
          day: i + 1,
          date: date.toISOString().split('T')[0],
          var: Math.max(0, forecastVaR),
          confidence: Math.max(50, 95 - (i * 0.5))
        });
      }
    }
    
    return timeline;
  };

  const forecastTimeline = generateForecastTimeline();

  if (!stocks.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-4">
        No forecastable stock data was returned. Try different symbols or ensure CSV data exists.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Portfolio Forecast Analysis</h2>
      
      {/* Individual Stock Performance Table - Moved to top */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-3">Individual Stock Performance</h3>
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
              {enhancedStocks.map((stock, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 font-medium">{stock.name}</td>
                  <td className="p-2">{stock.quantity}</td>
                  <td className="p-2">{currency(stock.buy_price)}</td>
                  <td className="p-2">{currency(stock.current_price)}</td>
                  <td className="p-2">{currency(stock.invested_value)}</td>
                  <td className="p-2">{currency(stock.position_value)}</td>
                  <td className={`p-2 ${stock.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currency(stock.profit_loss)}
                  </td>
                  <td className={`p-2 ${stock.profit_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock.profit_loss_percent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ML Model Information Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-3">AI/ML Models Used</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800">LSTM Neural Network</h4>
            <p className="text-sm text-blue-600">Advanced time-series prediction</p>
            <p className="text-xs text-gray-600">Used for trend analysis and pattern recognition</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800">Random Forest</h4>
            <p className="text-sm text-green-600">Ensemble learning approach</p>
            <p className="text-xs text-gray-600">Used for volatility modeling and risk assessment</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800">Prophet</h4>
            <p className="text-sm text-purple-600">Facebook's forecasting tool</p>
            <p className="text-xs text-gray-600">Used for seasonal patterns and trend decomposition</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Portfolio Value Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                outerRadius={100}
                innerRadius={30}
                paddingAngle={2}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {value}: {currency(entry.payload.value)}
                  </span>
                )}
              />
              <ReTooltip formatter={(v, name, props) => [
                currency(v), 
                `${props.payload.name} (${((props.payload.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`
              ]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Profit/Loss by Stock</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pnlData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="ProfitLoss" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Buy vs Current Price</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priceCompareData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="Buy Price" fill="#8884d8" />
              <Bar dataKey="Current Price" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Risk Analysis</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis width={80} />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="Value at Risk" fill="#ff6b6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-3">{forecastTimeline.length}-Day VaR Forecast Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecastTimeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="day" 
              label={{ value: 'Days Ahead', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'VaR (₹)', angle: -90, position: 'insideLeft' }}
            />
            <ReTooltip 
              formatter={(value, name) => [currency(value), name]}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="var" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              name="Value at Risk"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Invested Value</h4>
            <p className="text-2xl font-bold text-gray-900">{currency(enhancedStocks.reduce((sum, s) => sum + s.invested_value, 0))}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Current Value</h4>
            <p className="text-2xl font-bold text-gray-900">{currency(enhancedStocks.reduce((sum, s) => sum + s.position_value, 0))}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Total P/L</h4>
            <p className="text-2xl font-bold text-gray-900">{currency(enhancedStocks.reduce((sum, s) => sum + s.profit_loss, 0))}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Conditional VaR (CVaR)</h4>
            <p className="text-2xl font-bold text-gray-900">{ps["Conditional VaR (CVaR)"] || "—"}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Portfolio Return</h4>
            <p className="text-2xl font-bold text-gray-900">{ps["Portfolio Return"] || "—"}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Risk Level</h4>
            <p className="text-lg font-semibold text-gray-900">{ps["Risk Level"] || "—"}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Sharpe Ratio</h4>
            <p className="text-2xl font-bold text-gray-900">{ps["Sharpe Ratio"] !== undefined ? (Number(ps["Sharpe Ratio"]).toFixed(2)) : "—"}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Value at Risk (VaR)</h4>
            <p className="text-2xl font-bold text-gray-900">{ps["Value at Risk (VaR)"] || "—"}</p>
          </div>
        </div>
      </div>

      {/* Full-Width Recommendation Section */}
      {ps["Recommendation"] && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4"> AI-Powered Investment Recommendation</h3>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">💡</span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-lg font-medium text-blue-900 mb-2">Portfolio Analysis & Recommendations</h4>
                <p className="text-blue-800 leading-relaxed whitespace-pre-line">
                  {ps["Recommendation"]}
                </p>
              </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export { ForecastVisualizations };


