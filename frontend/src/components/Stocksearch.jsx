import { useState } from "react";
import axios from "axios";

export default function StockSearch({ onAdd }) {
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/stock/${symbol}`);
      setData(res.data);
      setError("");
    } catch {
      setError("Stock not found or API error.");
      setData(null);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g. RELIANCE.BO)"
          className="border p-2 w-full"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <button onClick={handleFetch} className="bg-blue-600 text-white px-4 rounded">
          Fetch
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {data && (
        <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
          <p><strong>{data.symbol}</strong> | Price: ₹{data.price} | Change: {data.changePercent.toFixed(2)}%</p>
          <button
            onClick={() => onAdd(data)}
            className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
          >
            Add to Portfolio
          </button>
        </div>
      )}
    </div>
  );
}
