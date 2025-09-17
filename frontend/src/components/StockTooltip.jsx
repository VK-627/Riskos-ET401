import React from "react";

const StockTooltip = ({ stock }) => {
  // Helper for formatting currency values (handles both string and number inputs)
  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === "N/A") return "N/A";
    
    const numValue = typeof value === "string" ? parseFloat(value.replace(/[₹,]/g, "")) : value;
    
    if (isNaN(numValue)) return "N/A";
    
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  // Helper for formatting percentage values
  const formatPercentage = (value) => {
    if (value === undefined || value === null || value === "N/A") return "N/A";
    
    const numValue = typeof value === "string" ? parseFloat(value.replace(/%/g, "")) : value;
    
    if (isNaN(numValue)) return "N/A";
    
    return `${numValue.toFixed(2)}%`;
  };

  // Extract values with fallbacks for different property naming conventions
  const getValueWithFallback = (obj, keys, defaultVal = "N/A") => {
    if (!obj) return defaultVal;
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return defaultVal;
  };

  // Get metrics with various possible property names
  const var_value = getValueWithFallback(stock, ["VaR", "var", "Value at Risk", "Value at Risk (VaR)"]);
  const cvar_value = getValueWithFallback(stock, ["CVaR", "cvar", "Conditional VaR", "Conditional VaR (CVaR)"]);
  const sharpe = getValueWithFallback(stock, ["Sharpe", "sharpe", "Sharpe Ratio"]);
  const maxDrawdown = getValueWithFallback(stock, ["Max Drawdown", "maxDrawdown", "Maximum Drawdown"]);
  const returnValue = getValueWithFallback(stock, ["Return", "return", "returnPct", "Portfolio Return"]);
  const weight = getValueWithFallback(stock, ["Weight", "weight", "allocation", "Allocation"]);

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg max-w-xs w-full">
      <h4 className="font-semibold text-lg mb-2 text-blue-800">
        {stock.ticker || stock.name || "Stock"}
      </h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">VaR:</span>
          <span className="font-medium">{formatCurrency(var_value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">CVaR:</span>
          <span className="font-medium">{formatCurrency(cvar_value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Sharpe:</span>
          <span className="font-medium">{sharpe !== "N/A" ? Number(sharpe).toFixed(2) : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Max Drawdown:</span>
          <span className="font-medium">{formatPercentage(maxDrawdown)}</span>
        </div>
        {returnValue !== "N/A" && (
          <div className="flex justify-between">
            <span className="text-gray-600">Return:</span>
            <span className={`font-medium ${parseFloat(returnValue) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercentage(returnValue)}
            </span>
          </div>
        )}
        {weight !== "N/A" && (
          <div className="flex justify-between">
            <span className="text-gray-600">Weight:</span>
            <span className="font-medium">{formatPercentage(weight)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export  { StockTooltip };