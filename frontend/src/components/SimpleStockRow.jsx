import React from 'react';

const SimpleStockRow = ({ stock }) => {
  if (!stock) return null;

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
      <div className="flex flex-col space-y-2">
        <div className="text-lg font-semibold text-gray-800">{stock.symbol}</div>
        <div className="text-2xl font-bold text-teal-600">
          ₹{Number(stock.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-sm text-gray-500">
          Source: {stock.source || 'Yahoo'}
        </div>
      </div>
    </div>
  );
};

export { SimpleStockRow };
