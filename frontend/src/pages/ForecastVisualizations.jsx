import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb"];

const currency = (n) => {
  if (n === undefined || n === null || isNaN(Number(n))) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));
};


const card = (title, value) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="text-xs uppercase text-gray-500">{title}</div>
    <div className="text-xl font-semibold mt-1">{value}</div>
  </div>
);

const coerceNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "string") {
    const stripped = v.replace(/[^0-9.-]/g, "");
    const n = Number(stripped);
    return isNaN(n) ? 0 : n;
  }
  return Number(v) || 0;
};

const normalizeStocks = (result) => {
  // result.individual_stocks is an object keyed by stock name
  if (!result || !result.individual_stocks) return [];
  return Object.entries(result.individual_stocks).map(([name, s]) => ({
    name,
    quantity: coerceNum(s.quantity),
    buy_price: coerceNum(s.buy_price),
    current_price: coerceNum(s.current_price),
    position_value: coerceNum(s.position_value),
    profit_loss: coerceNum(s.profit_loss),
    var_amount: coerceNum(s.var_amount),
  }));
};

const ForecastVisualizations = ({ result }) => {
  if (!result) return null;
  // Support both direct Flask payload and Mongo-wrapped payload from backend
  const root = result.individual_stocks ? result : (result.result || result);
  const stocks = normalizeStocks(root);
  const pieData = stocks.map((s) => ({ name: s.name, value: s.position_value }));
  const pnlData = stocks.map((s) => ({ name: s.name, ProfitLoss: s.profit_loss }));
  const priceCompareData = stocks.map((s) => ({ name: s.name, "Buy Price": s.buy_price, "Current Price": s.current_price }));
  const riskData = stocks.map((s) => ({ name: s.name, "Value at Risk": Math.abs(s.var_amount) }));

  const ps = root.portfolio_summary || {};

  if (!stocks.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-4">
        No forecastable stock data was returned. Try different symbols or ensure CSV data exists.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Portfolio Visualizations</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Portfolio Value Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <ReTooltip formatter={(v) => currency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Profit/Loss by Stock</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pnlData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="ProfitLoss" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Buy vs Current Price</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priceCompareData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="Buy Price" fill="#8884d8" />
              <Bar dataKey="Current Price" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Risk Analysis</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis width={80} />
              <ReTooltip formatter={(v) => currency(v)} />
              <Legend />
              <Bar dataKey="Value at Risk" fill="#ff6b6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-3">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {card("Conditional VaR (CVaR)", ps["Conditional VaR (CVaR)"] || "—")}
          {card("Maximum Drawdown", ps["Maximum Drawdown"] || "—")}
          {card("Portfolio Return", ps["Portfolio Return"] || "—")}
          {card("Recommendation", ps["Recommendation"] || "—")}
          {card("Risk Level", ps["Risk Level"] || "—")}
          {card("Sharpe Ratio", ps["Sharpe Ratio"] !== undefined ? (Number(ps["Sharpe Ratio"]).toFixed(2)) : "—")}
          {card("Total Portfolio Value", ps["Total Portfolio Value"] || ps["Total Portfolio Value (₹)"] || "—")}
          {card("Total Profit/Loss", ps["Total Profit/Loss"] || "—")}
          {card("Value at Risk (VaR)", ps["Value at Risk (VaR)"] || "—")}
        </div>
      </div>
    </div>
  );
};

export { ForecastVisualizations };


