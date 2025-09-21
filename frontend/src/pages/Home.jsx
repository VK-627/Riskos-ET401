import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedPortfolio, setSavedPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editForm, setEditForm] = useState({ stockName: '', quantity: '', buyPrice: '' });

  useEffect(() => {
    const fetchSavedPortfolio = async () => {
      try {
        const token = user?.token || localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(
          "http://localhost:5000/api/portfolio/saved",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSavedPortfolio(response.data.savedPortfolio || []);
      } catch (error) {
        console.error("Error fetching saved portfolio:", error);
        setError("Failed to load saved portfolio");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPortfolio();
  }, [user]);

  const handleQuickAction = (actionType) => {
    // Navigate to assessment with pre-filled data
    const state = {
      prefillData: savedPortfolio || [],
      activeMode: actionType === 'forecast' ? 'forecast' : 'calculate'
    };
    navigate('/assessment', { state });
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock._id);
    setEditForm({
      stockName: stock.stockName,
      quantity: stock.quantity.toString(),
      buyPrice: stock.buyPrice.toString()
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = user?.token || localStorage.getItem("token");
      if (!token) return;

      await axios.put(
        `http://localhost:5000/api/portfolio/update-stock/${editingStock}`,
        {
          stockName: editForm.stockName,
          quantity: parseFloat(editForm.quantity),
          buyPrice: parseFloat(editForm.buyPrice)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh portfolio data
      const response = await axios.get(
        "http://localhost:5000/api/portfolio/saved",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSavedPortfolio(response.data.savedPortfolio || []);
      setEditingStock(null);
      setEditForm({ stockName: '', quantity: '', buyPrice: '' });
    } catch (error) {
      console.error("Error updating stock:", error);
      setError("Failed to update stock");
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (!window.confirm("Are you sure you want to delete this stock from your portfolio?")) {
      return;
    }

    try {
      const token = user?.token || localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `http://localhost:5000/api/portfolio/delete-stock/${stockId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh portfolio data
      const response = await axios.get(
        "http://localhost:5000/api/portfolio/saved",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSavedPortfolio(response.data.savedPortfolio || []);
    } catch (error) {
      console.error("Error deleting stock:", error);
      setError("Failed to delete stock");
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

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading your portfolio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      <h1 className="text-3xl font-bold">🏠 Welcome to Riskos</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {savedPortfolio && savedPortfolio.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📊 Your Saved Portfolio</h2>
            <span className="text-sm text-gray-500">
              {savedPortfolio.length} stock{savedPortfolio.length !== 1 ? 's' : ''} saved
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-medium">Stock Name</th>
                  <th className="p-3 text-left font-medium">Quantity</th>
                  <th className="p-3 text-left font-medium">Buy Price</th>
                  <th className="p-3 text-left font-medium">Invested Value</th>
                  <th className="p-3 text-left font-medium">Added</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedPortfolio.map((stock, index) => (
                  <tr key={stock._id || index} className="border-t">
                    {editingStock === stock._id ? (
                      <>
                        <td className="p-3">
                          <input
                            type="text"
                            value={editForm.stockName}
                            onChange={(e) => setEditForm({...editForm, stockName: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={editForm.buyPrice}
                            onChange={(e) => setEditForm({...editForm, buyPrice: e.target.value})}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="p-3">
                          {formatCurrency(parseFloat(editForm.quantity) * parseFloat(editForm.buyPrice))}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(stock.addedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStock(null)}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium">{stock.stockName}</td>
                        <td className="p-3">{stock.quantity}</td>
                        <td className="p-3">{formatCurrency(stock.buyPrice)}</td>
                        <td className="p-3">{formatCurrency(stock.quantity * stock.buyPrice)}</td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(stock.addedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditStock(stock)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStock(stock._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleQuickAction('calculate')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center justify-center"
            >
              📈 Calculate Current Risk
            </button>
            <button
              onClick={() => handleQuickAction('forecast')}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center justify-center"
            >
              🔮 Forecast Future Risk
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-2xl font-semibold mb-4">No Portfolio Saved Yet</h2>
          <p className="text-gray-600 mb-6">
            Start by analyzing your first portfolio to get personalized risk insights and AI-powered recommendations.
          </p>
          <button
            onClick={() => navigate('/assessment')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition duration-300"
          >
            Start Portfolio Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export { Home };