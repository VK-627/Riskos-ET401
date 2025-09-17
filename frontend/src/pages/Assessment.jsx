import React, { useState, useEffect } from 'react';
import axios from 'axios';
import  { StockTooltip } from '../components/StockTooltip';
import { FaPlusCircle, FaMinusCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { ForecastVisualizations } from "./ForecastVisualizations";
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { StructuredRiskData } from '../components/StructuredRiskData';
import { AdvancedRiskCharts } from '../components/AdvancedRiskCharts';
import RiskAnalysisAdapter from '../components/RiskAnalysisAdapter'; // Adjust path as needed

const Assessment = () => {
  // Removed unused isLoggedIn
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([{ stockName: "", quantity: "", buyPrice: "" }]);
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [forecastDays, setForecastDays] = useState(30);
  // Removed unused riskType state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState("calculate");
  const [error, setError] = useState(null);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [openSuggestIndex, setOpenSuggestIndex] = useState(null);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await axios.get("http://localhost:5002/api/available_stocks");
        if (Array.isArray(res.data?.stocks)) {
          setAvailableStocks(res.data.stocks);
        }
      } catch {
        // Non-fatal
      }
    };
    fetchStocks();
  }, []);

  
  const handleAddStock = () => {
    setStockData([...stockData, { stockName: "", quantity: "", buyPrice: "" }]);
  };

  const handleRemoveStock = (index) => {
    const currentRow = stockData[index];
    const isFilled = currentRow.stockName || currentRow.quantity || currentRow.buyPrice;
    if (isFilled && !window.confirm("This row has data. Delete it?")) return;
    const updated = [...stockData];
    updated.splice(index, 1);
    setStockData(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...stockData];
    const nextVal = field === "stockName" ? value.toUpperCase() : value;
    updated[index][field] = nextVal;
    setStockData(updated);

    // Suggestions after 4+ chars on stockName
    if (field === "stockName") {
      const raw = nextVal.trim();
      if (raw.length >= 4 && availableStocks.length) {
        try {
          const rx = new RegExp(raw.replace(/[-/\\^$*+?.()|[\]{}]/g, "."), "i");
          const opts = availableStocks.filter((s) => rx.test(s)).slice(0, 8);
          setFilteredOptions(opts);
          setOpenSuggestIndex(index);
        } catch {
          const opts = availableStocks
            .filter((s) => s.toLowerCase().includes(raw.toLowerCase()))
            .slice(0, 8);
          setFilteredOptions(opts);
          setOpenSuggestIndex(index);
        }
      } else {
        setOpenSuggestIndex(null);
        setFilteredOptions([]);
      }
    }
  };

  const applySuggestion = (rowIndex, value) => {
    const updated = [...stockData];
    updated[rowIndex].stockName = value;
    setStockData(updated);
    setOpenSuggestIndex(null);
    setFilteredOptions([]);
  };

  const handleSubmit = async () => {
    // Check if user is logged in *after* they press Submit
    const token = user?.token || localStorage.getItem("token"); // Only use one source for the token
    
    if (!token || !user) {
      navigate("/signup");
      return;
    }
  
    // Validate inputs
    const hasEmptyFields = stockData.some(stock =>
      !stock.stockName || !stock.quantity || !stock.buyPrice
    );
  
    if (hasEmptyFields) {
      setError("Please fill in all stock details");
      return;
    }
  
    setLoading(true);
    setError(null);
  
    const payload = {
      portfolio: stockData.map(s => ({
        stockName: s.stockName,
        quantity: s.quantity,
        buyPrice: s.buyPrice,
      })),
      confidenceLevel,
      ...(activeMode === "forecast" && {
        forecastDays,
        folderPath: "flask-api\\Scripts"
      }),
    };
  
    try {
      const response = await axios.post(
        `http://localhost:5000/api/${activeMode === "forecast" ? "predict/analyze" : "risk/calculate"}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setResult(response.data);
    } catch (error) {
      console.error("Error calculating risk:", error);
      const data = error.response?.data;
      const message = data?.error || data?.message || "An error occurred. Please try again.";
      setError(message);
      if (Array.isArray(data?.availableStocks) && data.availableStocks.length) {
        setAvailableStocks(data.availableStocks);
      }
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">📈 Portfolio Risk Analysis</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Input Portfolio Details</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <table className="w-full border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Stock Name</th>
              <th className="p-2 text-left">Quantity</th>
              <th className="p-2 text-left">Buy Price (₹)</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockData.map((stock, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={stock.stockName}
                      onChange={(e) => handleChange(index, "stockName", e.target.value)}
                      placeholder="e.g. RELIANCE or RELIANCE.NS"
                      className="w-full border rounded px-2 py-1"
                    />
                    {openSuggestIndex === index && filteredOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-56 overflow-auto">
                        {filteredOptions.map((opt) => (
                          <div
                            key={opt}
                            onClick={() => applySuggestion(index, opt)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={stock.quantity}
                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={stock.buyPrice}
                    onChange={(e) => handleChange(index, "buyPrice", e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="p-2 flex gap-2 items-center">
                  {stockData.length > 1 && (
                    <FaMinusCircle
                      className="text-red-500 cursor-pointer"
                      onClick={() => handleRemoveStock(index)}
                    />
                  )}
                  {index === stockData.length - 1 && (
                    <FaPlusCircle
                      className="text-green-500 cursor-pointer"
                      onClick={handleAddStock}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Suggestions are rendered per-row as a dropdown after 4+ characters */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block mb-1 font-medium">Confidence Level (%)</label>
            <input
              type="number"
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(e.target.value)}
              placeholder="e.g. 95"
              className="w-full border rounded px-2 py-1"
            />
          </div>

          {activeMode === "forecast" && (
            <div>
              <label className="block mb-1 font-medium">Forecast Days</label>
              <input
                type="number"
                value={forecastDays}
                onChange={(e) => setForecastDays(e.target.value)}
                placeholder="e.g. 30"
                className="w-full border rounded px-2 py-1"
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => setActiveMode("calculate")}
              className={`px-4 py-2 rounded ${activeMode === "calculate" ? "bg-blue-600 text-white" : "border"}`}
            >
              Calculate Current Risk
            </button>
            <button
              onClick={() => setActiveMode("forecast")}
              className={`px-4 py-2 rounded ${activeMode === "forecast" ? "bg-purple-600 text-white" : "border"}`}
            >
              Forecast Future Risk
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`mt-4 ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white px-4 py-2 rounded flex items-center justify-center`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "Submit"
          )}
        </button>
      </div>

      {result && activeMode === "calculate" && (
        <div className="mt-6">
          <RiskAnalysisAdapter result={result} inputSummary={stockData} />
        </div>
      )}

      {result && activeMode === "forecast" && (
        <div className="mt-6">
          <ForecastVisualizations result={result} />
        </div>
      )}
    </div>
  );
};

export { Assessment };