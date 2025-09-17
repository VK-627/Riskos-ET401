import React from "react";
import { StockTooltip } from "./StockTooltip";
import { FaExclamationCircle } from "react-icons/fa";

const accentToBg = {
  rose: "bg-rose-50",
  amber: "bg-amber-50",
  indigo: "bg-indigo-50",
  cyan: "bg-cyan-50",
  emerald: "bg-emerald-50",
  blue: "bg-blue-50",
};

const RiskCard = ({ title, value, accent = "blue" }) => {
  const bgClass = accentToBg[accent] || accentToBg.blue;
  return (
    <div className={`rounded-lg shadow-md p-4 w-full sm:w-1/2 md:w-1/3 ${bgClass}`}>
      <h4 className="text-lg font-semibold mb-2 break-words">{title}</h4>
      <p className="text-2xl font-bold break-words whitespace-normal leading-snug">
        {value}
      </p>
    </div>
  );
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return "N/A";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
};

const formatPercent = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return "N/A";
  return `${(Number(value) * 100).toFixed(2)}%`;
};

// Renders the result in the desired card layout, supporting both the new generic shape
// and the Flask calculate-risk shape: { individual_stocks: {...}, portfolio_summary: {...} }
const StructuredRiskData = ({ result, inputSummary = [] }) => {
  if (!result) return null;

  const hasFlaskShape = result.individual_stocks && result.portfolio_summary;

  if (hasFlaskShape) {
    const portfolio = result.portfolio_summary || {};
    const individual = result.individual_stocks || {};

    // Build summary list from caller-provided input when available
    const summaryList = Array.isArray(inputSummary) && inputSummary.length > 0
      ? inputSummary
      : Object.keys(individual).map((name) => ({ stockName: name, quantity: "-", buyPrice: "-" }));

    // Map portfolio metrics
    const portfolioCards = [
      { title: "Value at Risk (VaR)", value: formatCurrency(portfolio["VaR (₹)"]) , accent: "rose"},
      { title: "Conditional VaR (CVaR)", value: formatCurrency(portfolio["CVaR (₹)"]) , accent: "amber"},
      { title: "Sharpe Ratio", value: portfolio["Sharpe Ratio"] !== undefined ? Number(portfolio["Sharpe Ratio"]).toFixed(2) : "N/A", accent: "indigo" },
      { title: "Max Drawdown", value: formatPercent(portfolio["Max Drawdown"]) , accent: "cyan"},
      { title: "Total Portfolio Value", value: formatCurrency(portfolio["Total Portfolio Value (₹)"]) , accent: "emerald"},
    ];

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Portfolio Risk Analysis</h2>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Portfolio Summary</h3>
          <ul className="pl-1 text-gray-700 space-y-2">
            {summaryList.map((s, idx) => {
              const keyExact = s.stockName || "";
              const keyUpper = keyExact.toUpperCase();
              const details = individual[keyExact] || individual[keyUpper];
              return (
                <li key={idx} className="flex items-center gap-2">
                  {details && (
                    <span className="relative group inline-flex items-center">
                      <FaExclamationCircle className="text-blue-600 cursor-help" />
                      <div className="hidden group-hover:block absolute z-20 top-5 left-0">
                        <StockTooltip stock={{
                          ticker: keyUpper,
                          VaR: details["VaR (₹)"],
                          CVaR: details["CVaR (₹)"],
                          Sharpe: details["Sharpe Ratio"],
                          "Max Drawdown": Number(details["Max Drawdown"]) * 100,
                        }} />
                      </div>
                    </span>
                  )}
                  <span className="font-semibold">{keyUpper}</span>
                  <span className="text-sm">{s.quantity} shares @ ₹{s.buyPrice}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          {portfolioCards.map((c, idx) => (
            <RiskCard key={idx} title={c.title} value={c.value} accent={c.accent} />
          ))}
        </div>
      </div>
    );
  }

  // Fallback: render the generic structure if present
  const { inputSummary: genericInput, portfolioRisk, stockLevelMetrics } = result;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Portfolio Risk Analysis</h2>

      {genericInput && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">🧾 Input Summary</h3>
          <ul className="list-disc pl-5 text-gray-700">
            {genericInput.map((item, idx) => (
              <li key={idx}>
                <strong>{item.stockName}</strong> — {item.quantity} shares @ ₹{item.buyPrice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {portfolioRisk && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">📉 Portfolio Risk Metrics</h3>
          <div className="flex flex-wrap gap-4">
            <RiskCard title="Value at Risk (VaR)" value={`₹${portfolioRisk.var || 'N/A'}`} />
            <RiskCard title="Conditional VaR (CVaR)" value={`₹${portfolioRisk.cvar || 'N/A'}`} />
            <RiskCard title="Sharpe Ratio" value={portfolioRisk.sharpeRatio || 'N/A'} />
            <RiskCard title="Max Drawdown" value={`₹${portfolioRisk.maxDrawdown || 'N/A'}`} />
          </div>
        </div>
      )}

      {stockLevelMetrics && stockLevelMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">📌 Individual Stock Risk</h3>
          {stockLevelMetrics.map((stock, idx) => (
            <div key={idx} className="mb-4 border rounded p-4">
              <h4 className="text-md font-bold mb-2">{stock.stockName}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <RiskCard title="VaR" value={`₹${stock.var || 'N/A'}`} />
                <RiskCard title="CVaR" value={`₹${stock.cvar || 'N/A'}`} />
                <RiskCard title="Sharpe Ratio" value={stock.sharpeRatio || 'N/A'} />
                <RiskCard title="Max Drawdown" value={`₹${stock.maxDrawdown || 'N/A'}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(result).filter(key =>
        !['inputSummary', 'portfolioRisk', 'stockLevelMetrics'].includes(key) &&
        result[key] && typeof result[key] === 'object'
      ).map(key => (
        <div key={key} className="mt-4">
          <h3 className="text-lg font-semibold mb-2">{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
          <div className="bg-gray-50 p-3 rounded border">
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result[key], null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export { StructuredRiskData, RiskCard };