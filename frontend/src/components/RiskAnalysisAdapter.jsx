import React from 'react';
import { AdvancedRiskCharts } from './AdvancedRiskCharts'; // Adjust import path as needed

// Data adapter component that transforms backend response to expected format
const RiskAnalysisAdapter = ({ result, inputSummary }) => {
  if (!result) return null;

  console.log("Original backend result:", result);

  // Transform the data to match AdvancedRiskCharts expectations, preserving numeric types
  const transformedResult = {
    portfolio_summary: result.portfolio_summary ? { ...result.portfolio_summary } : {},
    individual_stocks: {}
  };

  // Transform individual_stocks
  if (result.individual_stocks && inputSummary) {
    Object.entries(result.individual_stocks).forEach(([stockSymbol, stockData]) => {
      // Find matching input data
      const inputStock = inputSummary.find(stock => 
        stock.stockName === stockSymbol || 
        stock.stockName === stockSymbol.replace('.NS', '') ||
        `${stock.stockName}.NS` === stockSymbol
      );

      if (inputStock) {
        const quantity = parseFloat(inputStock.quantity) || 0;
        const buyPrice = parseFloat(inputStock.buyPrice) || 0;
        const positionValue = quantity * buyPrice;

        transformedResult.individual_stocks[stockSymbol] = {
          position_value: positionValue,
          var_amount: Math.abs(Number(stockData['VaR (₹)'] || 0)),
          cvar_amount: Math.abs(Number(stockData['CVaR (₹)'] || 0)),
          sharpe_ratio: Number(stockData['Sharpe Ratio'] || 0),
          max_drawdown: Math.abs(Number(stockData['Max Drawdown'] || 0)),
          profit_loss: 0,
          roi: 0,
          weight: positionValue / (Number(result.portfolio_summary?.['Total Portfolio Value (₹)'] || positionValue) || 1)
        };
      }
    });
  }

  console.log("Transformed result:", transformedResult);

  return <AdvancedRiskCharts result={transformedResult} inputSummary={inputSummary} />;
};

// Helper functions
const getRecommendation = (sharpeRatio, maxDrawdown) => {
  if (sharpeRatio > 0.5 && maxDrawdown < 0.2) return 'Buy More';
  if (sharpeRatio > 0.2 && maxDrawdown < 0.4) return 'Hold';
  if (sharpeRatio > 0 && maxDrawdown < 0.6) return 'Monitor';
  return 'Consider Selling';
};

const getRiskLevel = (sharpeRatio, maxDrawdown) => {
  if (sharpeRatio > 0.3 && maxDrawdown < 0.2) return 'Low';
  if (sharpeRatio > 0.1 && maxDrawdown < 0.45) return 'Moderate';
  return 'High';
};

export default RiskAnalysisAdapter;