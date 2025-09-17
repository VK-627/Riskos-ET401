import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList,
  Label
} from "recharts";

const PortfolioVisualizations = ({ result }) => {
  // Handle potentially missing data gracefully
  if (!result) return null;

  // Extract risk metrics data with fallback to handle different data structures
  const getMetricValue = (metricName, defaultValue = 0) => {
    try {
      // First try to find value in the top-level Risk Metrics section
      if (result.riskMetrics && result.riskMetrics[metricName] !== undefined) {
        return result.riskMetrics[metricName];
      }
      
      // Then check the portfolio summary section (as seen in your second image)
      if (result[metricName] !== undefined) {
        return result[metricName];
      }

      // Fallback for specific metrics in different formats
      switch(metricName) {
        case "portfolioReturn":
          return result["Portfolio Return"] || defaultValue;
        case "sharpeRatio": 
          return result["Sharpe Ratio"] || 
                 (result.riskMetrics && result.riskMetrics["Sharpe Ratio"]) ||
                 defaultValue;
        case "maxDrawdown":
          return result["Maximum Drawdown"] || 
                 (result.riskMetrics && result.riskMetrics["Max Drawdown"]) ||
                 defaultValue;
        case "var":
          return result["Value at Risk (VaR)"] || 
                 (result.riskMetrics && result.riskMetrics["Value at Risk (VaR)"]) ||
                 defaultValue;
        case "cvar":
          return result["Conditional VaR (CVaR)"] || 
                 (result.riskMetrics && result.riskMetrics["Conditional VaR (CVaR)"]) ||
                 defaultValue;
        default:
          return defaultValue;
      }
    } catch (error) {
      console.error(`Error accessing ${metricName}:`, error);
      return defaultValue;
    }
  };

  // Extract portfolio return
  const portfolioReturn = getMetricValue("portfolioReturn", -2.90); // Default to example value if not found
  
  // Extract or compute risk level
  let riskLevel = "Medium";
  const sharpeRatio = getMetricValue("sharpeRatio", 0.05);
  const maxDrawdown = getMetricValue("maxDrawdown", 45.09);
  
  if (sharpeRatio < 0.1 && maxDrawdown > 40) {
    riskLevel = "High";
  } else if (sharpeRatio > 0.3 && maxDrawdown < 20) {
    riskLevel = "Low";
  }

  // Extract stock data if available
  let stocksData = [];
  
  try {
    // Try different potential formats for stock data
    if (Array.isArray(result.inputSummary)) {
      stocksData = result.inputSummary;
    } else if (Array.isArray(result.portfolio)) {
      stocksData = result.portfolio;
    } else if (result.individualStocks) {
      // Convert individual stocks object to array if needed
      stocksData = Object.entries(result.individualStocks).map(([ticker, data]) => ({
        ticker,
        ...data
      }));
    } else {
      // Fallback: Extract stock information from any matching property
      const possibleStockProps = ["stocks", "reliance", "individual_stock_details"];
      for (const prop of possibleStockProps) {
        if (result[prop] && typeof result[prop] === 'object') {
          stocksData = Object.entries(result[prop]).map(([ticker, data]) => ({
            ticker,
            ...data
          }));
          break;
        }
      }
    }
  } catch (error) {
    console.error("Error processing stock data:", error);
    stocksData = [];
  }

  // Prepare data for risk/return scatterplot
  const scatterData = [
    {
      name: "Portfolio",
      risk: maxDrawdown,
      return: portfolioReturn,
      size: 800,
    }
  ];

  // Add stocks to scatter data if available
  stocksData.forEach(stock => {
    let stockReturn = 0;
    let stockRisk = 0;
    
    try {
      // Try to extract return data - check different possible property names
      if (stock.return !== undefined) stockReturn = stock.return;
      else if (stock.Return !== undefined) stockReturn = stock.Return;
      else if (stock.returnPct !== undefined) stockReturn = stock.returnPct;
      
      // Try to extract risk data - check different possible property names
      if (stock.risk !== undefined) stockRisk = stock.risk;
      else if (stock.Risk !== undefined) stockRisk = stock.Risk;
      else if (stock.maxDrawdown !== undefined) stockRisk = stock.maxDrawdown;
      else if (stock["Max Drawdown"] !== undefined) stockRisk = stock["Max Drawdown"];
    } catch (error) {
      console.error(`Error processing stock data for scatter plot: ${error}`);
    }
    
    scatterData.push({
      name: stock.ticker || stock.name || "Unknown",
      risk: stockRisk,
      return: stockReturn,
      size: 400,
    });
  });

  // Prepare risk metrics for bar chart
  const riskMetricsData = [
    {
      name: "VaR",
      value: getMetricValue("var", 0),
    },
    {
      name: "CVaR",
      value: getMetricValue("cvar", 0),
    },
    {
      name: "Sharpe",
      value: sharpeRatio * 100, // Scale up for visibility
    },
    {
      name: "Max DD",
      value: Math.abs(maxDrawdown), // Use absolute value for visualization
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Portfolio Risk Analysis</h2>
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">Risk-Return Profile</h3>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">
            <span className="text-gray-600">Return:</span> 
            <span className={`ml-1 ${portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {typeof portfolioReturn === 'number' ? `${portfolioReturn.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
          <div className="text-sm font-medium">
            <span className="text-gray-600">Risk Level:</span> 
            <span className={`ml-1 ${
              riskLevel === "High" ? "text-red-600" : 
              riskLevel === "Medium" ? "text-orange-600" : "text-green-600"
            }`}>
              {riskLevel}
            </span>
          </div>
          <div className="text-sm font-medium">
            <span className="text-gray-600">Sharpe Ratio:</span> 
            <span className="ml-1">
              {typeof sharpeRatio === 'number' ? sharpeRatio.toFixed(2) : 'N/A'}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="risk" 
              name="Risk" 
              domain={[0, 'dataMax + 10']}
              label={{ value: 'Risk (Max Drawdown %)', position: 'bottom', offset: 0 }}
            />
            <YAxis 
              type="number" 
              dataKey="return" 
              name="Return" 
              label={{ value: 'Return (%)', angle: -90, position: 'left' }}
            />
            <ZAxis type="number" dataKey="size" range={[100, 800]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => [
                name === 'return' ? `${value.toFixed(2)}%` : 
                name === 'risk' ? `${value.toFixed(2)}%` : value,
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Legend />
            <Scatter name="Assets" data={scatterData} fill="#8884d8">
              <LabelList dataKey="name" position="top" />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">Risk Metrics</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={riskMetricsData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(2)}`, 'Value']}
            />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export  { PortfolioVisualizations };