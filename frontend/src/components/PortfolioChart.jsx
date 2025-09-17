import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function PortfolioChart({ holdings = [] }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchPortfolioValue = () => {
      const now = new Date();
      const timeSeries = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const day = date.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric"
        });

        let totalValue = 0;

        for (let stock of holdings) {
          const simulatedPrice = Math.floor(Math.random() * 200) + 100;
          totalValue += simulatedPrice * stock.quantity;
        }

        timeSeries.push({ date: day, value: totalValue });
      }

      setChartData(timeSeries);
    };

    if (Array.isArray(holdings) && holdings.length > 0) {
      fetchPortfolioValue();
    }
  }, [holdings]);

  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <h3 className="text-lg font-semibold mb-2">Live Portfolio Value</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <CartesianGrid strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            fill="url(#colorVal)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
