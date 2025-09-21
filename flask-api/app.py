"""
Enhanced Flask API for RISKOS portfolio prediction with improved stock symbol matching.
Integrates existing calculation methods with robust stock file matching.
"""

import os
import numpy as np
import traceback
import pandas as pd
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Import from existing modules
from utils.data_loader import load_stock_data, get_csv_file_mapping
from models.risk_metrics import (
    calculate_var,
    calculate_cvar,
    calculate_sharpe_ratio,
    calculate_max_drawdown
)
from models.portfolio_prediction import predict_portfolio_risk

# Import the StockMatcher from our new module
from models.stock_matcher import StockMatcher

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", 
                              "allow_headers": ["Content-Type", "Authorization"]}})

# Configure paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STOCK_DATA_PATH = os.path.join(BASE_DIR, 'Scripts')

# Initialize stock matcher
stock_matcher = StockMatcher(STOCK_DATA_PATH)

# Load stock data and mapping using existing functions
try:
    stock_prices = load_stock_data(STOCK_DATA_PATH)
    stock_mapping = get_csv_file_mapping(STOCK_DATA_PATH)
    returns = stock_prices.pct_change().dropna()
    print(f"Successfully loaded data for {len(stock_mapping)} stocks")
except Exception as e:
    print(f"Error loading initial data: {e}")
    traceback.print_exc()
    # Initialize empty as backup
    stock_prices = None
    stock_mapping = {}
    returns = None

@app.route('/calculate-risk', methods=['POST'])
def calculate_risk():
    try:
        data = request.get_json()
        print("Received request with data:", data)

        portfolio = data.get("portfolio", [])
        confidence_level = float(data.get("confidenceLevel", 95))

        # Calculate total portfolio value
        portfolio_value = sum(int(float(stock["quantity"])) * int(float(stock["buyPrice"])) for stock in portfolio)

        # Calculate individual stock values
        stock_values = {}
        for stock in portfolio:
            stock_name = stock["stockName"]
            # Use stock matcher to get the proper stock display name
            _, display_name = stock_matcher.get_matching_file(stock_name)
            
            if not display_name:
                print(f"Warning: No match found for stock {stock_name}")
                continue
                
            stock_values[stock_name] = int(float(stock["quantity"])) * stock_prices[display_name].iloc[-1]

        # Individual stock risk metrics
        risk_metrics = {}
        for stock in portfolio:
            stock_symbol = stock["stockName"]
            # Use stock matcher to get the proper stock display name
            _, display_name = stock_matcher.get_matching_file(stock_symbol)
            
            if not display_name or display_name not in returns.columns:
                print(f"Warning: No return data for stock {stock_symbol}")
                continue
                
            stock_returns = returns[display_name]
            stock_value = stock_values.get(stock_symbol)
            
            if stock_value is None:
                continue

            risk_metrics[stock_symbol] = {
                "VaR (₹)": calculate_var(stock_returns, stock_value, confidence_level),
                "CVaR (₹)": calculate_cvar(stock_returns, stock_value, confidence_level),
                "Sharpe Ratio": calculate_sharpe_ratio(stock_returns),
                "Max Drawdown": calculate_max_drawdown(stock_prices[display_name])
            }

        # If we have no valid stocks, return an error
        if not stock_values:
            return jsonify({
                "error": "No valid stocks found in portfolio",
                "availableStocks": stock_matcher.list_available_stocks()
            }), 400

        # Portfolio-level metrics
        weights = []
        selected_columns = []
        
        for stock in portfolio:
            stock_symbol = stock["stockName"]
            
            if stock_symbol not in stock_values:
                continue
                
            # Use stock matcher to get the proper stock display name
            _, display_name = stock_matcher.get_matching_file(stock_symbol)
            
            if not display_name:
                continue
                
            weights.append(stock_values[stock_symbol] / portfolio_value)
            selected_columns.append(display_name)
        
        weights = np.array(weights)
        
        if len(selected_columns) == 0:
            return jsonify({
                "error": "No valid stocks found in portfolio",
                "availableStocks": stock_matcher.list_available_stocks()
            }), 400
            
        selected_returns = returns[selected_columns]
        portfolio_returns = selected_returns.dot(weights)

        portfolio_risk_metrics = {
            "Total Portfolio Value (₹)": round(portfolio_value, 2),
            "VaR (₹)": calculate_var(portfolio_returns, portfolio_value, confidence_level),
            "CVaR (₹)": calculate_cvar(portfolio_returns, portfolio_value, confidence_level),
            "Sharpe Ratio": calculate_sharpe_ratio(portfolio_returns),
            "Max Drawdown": calculate_max_drawdown(stock_prices.mean(axis=1))
        }

        return jsonify({
            "individual_stocks": risk_metrics,
            "portfolio_summary": portfolio_risk_metrics
        })

    except Exception as e:
        print("Error in calculating risk:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/predict-portfolio', methods=['POST'])
def predict_portfolio():
    try:
        data = request.get_json()
        print("Received request in Flask predict-portfolio:", data)

        # Extract data from the request
        portfolio_stocks = data.get("portfolio", [])
        confidence_level = float(data.get("confidenceLevel", 95)) / 100  # Convert percentage to decimal
        forecast_days = int(data.get("forecastDays", 30))

        # Debug logging
        print(f"Processing predict-portfolio with:")
        print(f"- Portfolio stocks: {portfolio_stocks}")
        print(f"- Confidence level: {confidence_level}")
        print(f"- Forecast days: {forecast_days}")
            
        # Validate request data
        if not portfolio_stocks or not isinstance(portfolio_stocks, list) or len(portfolio_stocks) == 0:
            return jsonify({"error": "Portfolio must be a non-empty list of stocks"}), 400
            
        # Validate each stock in the portfolio
        for stock in portfolio_stocks:
            if not isinstance(stock, dict):
                return jsonify({"error": "Each stock must be an object"}), 400
                
            if 'stockName' not in stock or not stock['stockName']:
                return jsonify({"error": "Each stock must have a stockName"}), 400
                
            if 'quantity' not in stock or not stock['quantity']:
                return jsonify({"error": "Each stock must have a quantity"}), 400
                
            if 'buyPrice' not in stock or not stock['buyPrice']:
                return jsonify({"error": "Each stock must have a buyPrice"}), 400

        # Create a mapping of normalized stock names to file paths
        stock_file_mapping = {}
        missing_stocks = []
        
        for stock in portfolio_stocks:
            stock_name = stock.get('stockName', '')
            
            # Use our enhanced stock matcher to find the file
            file_path, display_name = stock_matcher.get_matching_file(stock_name)
            
            if file_path and display_name:
                print(f"Found match for '{stock_name}': {display_name} -> {file_path}")
                
                # Add to the mapping in the format expected by predict_portfolio_risk
                normalized_name = stock_matcher._normalize_stock_name(stock_name)
                # Ensure consistency with portfolio_prediction.normalize_stock_symbol
                if normalized_name.endswith("ns"):
                  normalized_name = normalized_name[:-2]
                stock_file_mapping[normalized_name] = {
                    "path": file_path,
                    "original_name": display_name
                }
            else:
                print(f"No match found for stock: {stock_name}")
                missing_stocks.append(stock_name)
        
        # Note: Missing stocks will be handled by portfolio_prediction.py via yfinance fallback
        if missing_stocks:
            print(f"Stocks not found in CSV, will attempt live fetch: {missing_stocks}")

        # Call the portfolio prediction function
        try:
            # read allowed models from env; default to fast production-safe models
            enabled_models = os.getenv('ENABLED_MODELS', 'RandomForest,Trend,Lag1').split(',')
            enabled_models = [m.strip() for m in enabled_models if m.strip()]

            output = predict_portfolio_risk(
                stock_file_mapping,
                portfolio_stocks,
                forecast_days=forecast_days,
                confidence_level=confidence_level,
                allowed_models=enabled_models
            )
            print("Prediction output:", output)
            # If the prediction function returned an error payload, surface it as a 400
            if isinstance(output, dict) and output.get("error"):
                return jsonify(output), 400
            return jsonify(output)
        except Exception as e:
            print("Error in portfolio prediction function:", e)
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    except Exception as e:
        print("Error in portfolio prediction route:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/available_stocks', methods=['GET'])
def get_available_stocks():
    """
    Endpoint to get list of all available stocks.
    """
    try:
        stocks = stock_matcher.list_available_stocks()
        return jsonify({
            "stocks": stocks,
            "count": len(stocks)
        })
    except Exception as e:
        print(f"Error getting available stocks: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to get available stocks: {str(e)}"}), 500


# Add a test route to verify the API is running
@app.route('/test', methods=['GET'])
def test_route():
    return jsonify({
        "status": "Flask API is running",
        "availableStocks": len(stock_matcher.list_available_stocks())
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5002)