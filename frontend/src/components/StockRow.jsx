import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const StockRow = ({ symbol }) => {
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate mock chart data (historical prices) for the symbol
  const generateChartData = useCallback(() => {
    const data = [];
    const now = new Date();
    let basePrice = stockData?.price || 2000;
    // Generate 30 data points for last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Create some realistic price movement (with some randomness but following a trend)
      const randomFactor = Math.random() * 0.04 - 0.02; // -2% to +2%
      basePrice = basePrice * (1 + randomFactor);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: basePrice
      });
    }
    return data;
  }, [stockData]);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        // Fetch current stock data
        const response = await fetch(`/api/market/price/${symbol}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        setStockData({
          symbol: symbol,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          marketCap: data.marketCap || 'N/A',
          peRatio: data.peRatio || 'N/A',
          dividendYield: data.dividendYield || 'N/A',
          fiftyTwoWeekRange: data.fiftyTwoWeekRange || 'N/A',
          source: data.source || 'API'
        });
        
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [symbol]);

  // Generate chart data when stock data is available
  useEffect(() => {
    if (stockData) {
      setChartData(generateChartData());
    }
  }, [stockData, generateChartData]);

  if (loading) return <div className="p-4 border rounded-lg">Loading data for {symbol}...</div>;
  if (error) return <div className="p-4 border rounded-lg text-red-500">Error loading {symbol}: {error}</div>;
  if (!stockData) return <div className="p-4 border rounded-lg">No data available for {symbol}</div>;

  // Extract ticker from symbol (remove exchange suffix)
  const ticker = symbol.split('.')[0];

  // Determine if price is up or down
  const priceColor = stockData.change >= 0 ? 'text-green-600' : 'text-red-600';
  const chartColor = stockData.change >= 0 ? '#10B981' : '#EF4444';

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow mb-4">
      <div className="flex flex-wrap md:flex-nowrap">
        {/* Stock Info Section - Left Column */}
        <div className="w-full md:w-1/3 pr-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg">{ticker}</h3>
              <p className="text-xs text-gray-500">Source: {stockData.source}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">₹{stockData.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <p className={`text-sm ${priceColor}`}>
                {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p className="text-gray-600">Market Cap: <br /><span className="font-medium">{stockData.marketCap}</span></p>
            <p className="text-gray-600">P/E Ratio: <br /><span className="font-medium">{stockData.peRatio}</span></p>
            <p className="text-gray-600">Dividend Yield: <br /><span className="font-medium">{stockData.dividendYield}</span></p>
            <p className="text-gray-600">52W Range: <br /><span className="font-medium">{stockData.fiftyTwoWeekRange}</span></p>
          </div>
        </div>
        
        {/* Chart Section - Right Column */}
        <div className="w-full md:w-2/3 h-40 mt-4 md:mt-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                hide={true}
              />
              <YAxis 
                domain={['dataMin - 1%', 'dataMax + 1%']}
                hide={true}
              />
              <Tooltip 
                formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor} 
                strokeWidth={2} 
                dot={false} 
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export { StockRow };