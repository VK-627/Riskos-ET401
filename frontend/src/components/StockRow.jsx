import React from 'react';

const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
};

const StockRow = ({ position, individual, tooltipStock, currentPrice }) => {
  // Calculate profit/loss indicators
  const investedValue = position.quantity * position.buyPrice;
  const currentValue = currentPrice ? position.quantity * currentPrice : investedValue;
  const profitLoss = currentValue - investedValue;
  const profitLossPercent = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;

  return (
    <tr className="border-t">
      <td className="p-2 font-medium">{position.name}</td>
      <td className="p-2">{position.quantity}</td>
      <td className="p-2">{formatCurrency(position.buyPrice)}</td>
      <td className="p-2">{currentPrice ? formatCurrency(currentPrice) : '—'}</td>
      <td className="p-2">
        {currentPrice ? (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            profitLoss >= 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <span>{profitLoss >= 0 ? '↗' : '↘'}</span>
            <span>{profitLossPercent.toFixed(2)}%</span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
};

export { StockRow };