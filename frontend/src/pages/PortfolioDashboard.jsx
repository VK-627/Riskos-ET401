import { useState, useEffect } from "react";
import axios from "axios";
import PortfolioChart from "../components/PortfolioChart";
import PortfolioTable from "../components/PortfolioTable";
import StockSearch from "../components/Stocksearch";

export function PortfolioDashboard() {
  const [portfolio, setPortfolio] = useState([]);

  // Function to fetch portfolio from backend
  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem("token"); // Assuming you store token in localStorage
      const response = await axios.get("/api/portfolio/add-portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPortfolio(response.data);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    }
  };

  // Fetch portfolio on page load
  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAddStock = async (stock) => {
    const quantity = parseFloat(prompt(`Enter quantity for ${stock.symbol}`));
    const buyPrice = parseFloat(prompt(`Enter buy price for ${stock.symbol}`));
    if (!quantity || !buyPrice) return;

    const newStock = { ...stock, quantity, buyPrice };

    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/portfolio/add-stock", newStock, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update local state after successful POST
      setPortfolio((prev) => [...prev, newStock]);
    } catch (error) {
      console.error("Failed to add stock:", error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      <h1 className="text-3xl font-bold">📊 My Portfolio</h1>

      {/* Chart and Table */}
      <PortfolioChart holdings={portfolio} />  {/* passing real data */}
      <PortfolioTable holdings={portfolio} />  {/* passing real data */}

      {/* Stock Search */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Add New Stock</h3>
        <StockSearch onAdd={handleAddStock} />
      </div>
    </div>
  );
}

export default PortfolioDashboard;
