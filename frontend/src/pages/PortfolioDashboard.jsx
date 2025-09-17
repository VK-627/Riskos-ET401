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
      const response = await axios.get("/api/portfolio", {
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
      await axios.post("/api/portfolio", newStock, {
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Portfolio</h2>

      {/* Chart and Table */}
      <PortfolioChart holdings={portfolio} />  {/* passing real data */}
      <PortfolioTable holdings={portfolio} />  {/* passing real data */}

      {/* Stock Search */}
      <div className="mt-8">
        <StockSearch onAdd={handleAddStock} />
      </div>
    </div>
  );
}

export default PortfolioDashboard;
