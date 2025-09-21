import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const History = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = user?.token || localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(
          "http://localhost:5000/api/portfolio/history",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setHistory(response.data.history || []);
      } catch (error) {
        console.error("Error fetching history:", error);
        setError("Failed to load calculation history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all calculation history? This action cannot be undone.")) {
      return;
    }

    setClearing(true);
    try {
      const token = user?.token || localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        "http://localhost:5000/api/portfolio/clear-history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setHistory([]);
      alert("History cleared successfully!");
    } catch (error) {
      console.error("Error clearing history:", error);
      setError("Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(Number(value))) return "₹0";
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR", 
      maximumFractionDigits: 2 
    }).format(Number(value));
  };

  const getCalculationTypeIcon = (type) => {
    return type === 'forecast_risk' ? '🔮' : '📊';
  };

  const getCalculationTypeName = (type) => {
    return type === 'forecast_risk' ? 'Forecast Future Risk' : 'Calculate Current Risk';
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📚 Calculation History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            className={`px-4 py-2 rounded-lg font-medium ${
              clearing 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {clearing ? "Clearing..." : "🗑️ Clear All History"}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold mb-4">No Calculation History</h2>
          <p className="text-gray-600 mb-6">
            Your risk analysis calculations will appear here once you start using the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCalculationTypeIcon(entry.calculationType)}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{getCalculationTypeName(entry.calculationType)}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.calculatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Confidence: {entry.confidenceLevel}%
                  </div>
                  {entry.forecastDays && (
                    <div className="text-sm text-gray-600">
                      Forecast: {entry.forecastDays} days
                    </div>
                  )}
                </div>
              </div>

              {/* Portfolio Details */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Portfolio:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left text-sm font-medium text-gray-600">Stock</th>
                        <th className="p-2 text-left text-sm font-medium text-gray-600">Quantity</th>
                        <th className="p-2 text-left text-sm font-medium text-gray-600">Buy Price</th>
                        <th className="p-2 text-left text-sm font-medium text-gray-600">Invested Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.portfolio.map((stock, stockIndex) => (
                        <tr key={stockIndex} className="border-t">
                          <td className="p-2 font-medium">{stock.stockName}</td>
                          <td className="p-2">{stock.quantity}</td>
                          <td className="p-2">{formatCurrency(stock.buyPrice)}</td>
                          <td className="p-2">{formatCurrency(stock.quantity * stock.buyPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { History };