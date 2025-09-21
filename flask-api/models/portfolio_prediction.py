"""
Updated portfolio_prediction.py file to better handle stock name matching
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
from utils.data_providers import fetch_close_series, get_current_price
import warnings
import json
try:
    import joblib
except Exception:
    joblib = None

# Suppress warnings
warnings.filterwarnings('ignore')

def get_csv_file_mapping(folder_path):
    """Create a mapping of stock symbols to their CSV file paths."""
    file_mapping = {}
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"The folder '{folder_path}' does not exist.")

    print(f"Scanning folder: {folder_path}")
    for file_name in os.listdir(folder_path):
        if file_name.endswith('.csv'):
            # Extract the stock symbol removing extension and _data
            stock_symbol = file_name.split('_')[0].lower()  # Convert to lowercase for case-insensitive matching
            file_mapping[stock_symbol] = {
                "path": os.path.join(folder_path, file_name),
                "original_name": file_name.split('_')[0]  # Keep the original name for reference
            }
    
    print(f"Found {len(file_mapping)} stock files in {folder_path}")
    print(f"Available stocks: {list(file_mapping.keys())}")
    return file_mapping

def calculate_var(returns, portfolio_value, confidence_level=95):
    var_threshold = np.percentile(returns, 100 - confidence_level)
    return round(var_threshold * portfolio_value, 2)

def calculate_cvar(returns, portfolio_value, confidence_level=95):
    var_threshold = np.percentile(returns, 100 - confidence_level)
    cvar = returns[returns <= var_threshold].mean()
    return round(cvar * portfolio_value, 2)

def calculate_sharpe_ratio(returns, risk_free_rate=0.05):
    """Calculate Sharpe Ratio."""
    excess_returns = returns.mean() - (risk_free_rate / 252)
    return round(excess_returns / returns.std(), 2)

def calculate_max_drawdown(returns):
    """Calculate Maximum Drawdown."""
    cum_returns = (1 + returns / 100).cumprod()
    running_max = cum_returns.cummax()
    drawdown = (cum_returns - running_max) / running_max
    return round(drawdown.min() * 100, 4)

def normalize_stock_symbol(symbol):
    """Normalize stock symbol to match StockMatcher mapping.

    StockMatcher stores keys in lowercase without the ".ns" suffix. Here we
    mirror that behavior so inputs like "ADANIENT.NS" normalize to "adanient".
    """
    if symbol is None:
        return ""
    s = str(symbol).strip().lower()
    # Remove trailing .ns if present, then remove any remaining dots/spaces
    if s.endswith('.ns'):
        s = s[:-3]
    s = s.replace('.', '').replace(' ', '')
    return s

def predict_portfolio_risk(stock_file_mapping, portfolio_stocks, forecast_days=30, confidence_level=0.95, allowed_models=None):
    """Main prediction function."""
    # Debug the input parameters
    print(f"predict_portfolio_risk called with:")
    print(f"- {len(portfolio_stocks)} stocks in portfolio: {[stock.get('stockName', '') for stock in portfolio_stocks]}")
    print(f"- forecast_days: {forecast_days}")
    print(f"- confidence_level: {confidence_level}")
    print(f"- available stock symbols: {list(stock_file_mapping.keys())}")
    
    stock_results = {}
    all_returns_data = {}
    stock_weights = {}
    portfolio_value = 0
    total_profit_loss = 0
    
    # Create output directory
    output_dir = "portfolio_analysis_outputs"
    os.makedirs(output_dir, exist_ok=True)

    # Load data and calculate metrics
    for stock in portfolio_stocks:
        # Get and normalize stock name for case-insensitive matching
        raw_symbol = stock.get('stockName', '')
        symbol = normalize_stock_symbol(raw_symbol)
        
        print(f"Looking for stock: '{raw_symbol}' (normalized: '{symbol}')")
        
        # Get quantity and buy_price
        quantity = stock.get('quantity', 0)
        buy_price = stock.get('buyPrice', 0)
        
        # Ensure we have numeric types
        try:
            quantity = int(quantity)
            buy_price = int(buy_price)
        except (ValueError, TypeError):
            print(f"Invalid quantity ({quantity}) or buy price ({buy_price}) for {symbol}. Skipping...")
            continue
        
        print(f"Processing stock: {symbol}, quantity: {quantity}, buy_price: {buy_price}")
        
        # Check if the stock exists in our mapping
        use_live = False
        if not symbol or symbol not in stock_file_mapping:
            # Try alternative forms of the stock symbol
            alternative_symbols = [
                symbol.upper(),
                symbol.lower(),
                f"{symbol.upper()}.ns",
                f"{symbol.lower()}.ns",
                symbol.replace('.ns', '').lower()
            ]
            
            found = False
            for alt_symbol in alternative_symbols:
                normalized_alt = normalize_stock_symbol(alt_symbol)
                if normalized_alt in stock_file_mapping:
                    symbol = normalized_alt
                    print(f"Found alternative match: '{alt_symbol}' -> '{symbol}'")
                    found = True
                    break
            
            if not found:
                print(f"No data file found for {raw_symbol}. Falling back to live fetch.")
                use_live = True

        try:
            if use_live:
                close_series = fetch_close_series(raw_symbol)
                current_price = float(close_series.iloc[-1])
                returns = (close_series.pct_change() * 100).dropna()
            else:
                # Load and process stock data
                csv_path = stock_file_mapping[symbol]["path"]
                print(f"Loading data from {csv_path}")
                stock_df = pd.read_csv(csv_path, parse_dates=['Date'])
                if 'Close' not in stock_df.columns:
                    price_columns = [col for col in stock_df.columns if 'close' in col.lower() or 'price' in col.lower()]
                    if price_columns:
                        stock_df['Close'] = stock_df[price_columns[0]]
                    elif len(stock_df.columns) >= 3:
                        stock_df['Close'] = stock_df.iloc[:, 2]
                    else:
                        print(f"No suitable price column found in {csv_path}")
                        continue
                stock_df['Close'] = pd.to_numeric(stock_df['Close'], errors='coerce')
                stock_df.dropna(subset=['Close'], inplace=True)
                if stock_df.empty:
                    print(f"No valid data found for {symbol} after cleaning. Skipping...")
                    continue
                if 'Date' in stock_df.columns:
                    stock_df.set_index('Date', inplace=True)
                current_price = stock_df['Close'].iloc[-1]
                returns = (stock_df['Close'].pct_change() * 100).dropna()
            position_value = current_price * quantity
            portfolio_value += position_value
            profit_loss = (current_price - buy_price) * quantity
            total_profit_loss += profit_loss

            all_returns_data[symbol] = returns
            stock_weights[symbol] = position_value
            
            print(f"Processed {symbol}: current_price={current_price}, position_value={position_value}")

        except Exception as e:
            print(f"Error processing {symbol}: {str(e)}")
            continue

    # Calculate weights
    for symbol in stock_weights:
        if portfolio_value > 0:  # Avoid division by zero
            stock_weights[symbol] = stock_weights[symbol] / portfolio_value
        else:
            stock_weights[symbol] = 0

    # helper metrics functions
    def _mae(a, p):
        return float(np.mean(np.abs(p - a)))

    def _rmse(a, p):
        return float(np.sqrt(np.mean((p - a) ** 2)))

    def _mase(a, p, insample):
        # Mean Absolute Scaled Error relative to in-sample naive (lag1)
        eps = 1e-8
        naive_err = np.mean(np.abs(np.diff(insample))) if len(insample) > 1 else eps
        return float(np.mean(np.abs(p - a)) / max(eps, naive_err))

    def _classification_metrics(a, p):
        # binary directional metrics: positive return -> 1, else 0
        a_bin = (np.array(a) > 0).astype(int)
        p_bin = (np.array(p) > 0).astype(int)
        tp = int(np.sum((a_bin == 1) & (p_bin == 1)))
        fp = int(np.sum((a_bin == 0) & (p_bin == 1)))
        fn = int(np.sum((a_bin == 1) & (p_bin == 0)))
        tn = int(np.sum((a_bin == 0) & (p_bin == 0)))
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        return {'precision': float(precision), 'recall': float(recall), 'f1': float(f1), 'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn}


    def simple_trend_forecast(values):
        # Linear extrapolation on numeric array-like values
        try:
            y = np.asarray(values)
            if len(y) < 3:
                return float(y[-1])
            x = np.arange(len(y)).astype(float)
            coef = np.polyfit(x, y, 1)
            next_x = float(len(y))
            return float(np.polyval(coef, next_x))
        except Exception:
            return float(values[-1])

    # Try to load a persisted RandomForest model if available (optional)
    rf_model = None
    rf_per_symbol = {}
    if allowed_models is None:
        allowed_models = ['RandomForest', 'Trend', 'Lag1']

    if 'RandomForest' in allowed_models and joblib is not None:
        # load per-symbol persisted RFs from persisted_models folder if present
        persisted_dir = os.path.join(os.path.dirname(__file__), 'persisted_models')
        if os.path.isdir(persisted_dir):
            for fname in os.listdir(persisted_dir):
                if fname.endswith('_rf.pkl'):
                    sym = fname.split('_')[0].lower()
                    try:
                        rf_per_symbol[sym] = joblib.load(os.path.join(persisted_dir, fname))
                    except Exception:
                        pass

    # Calculate metrics and forecasts
    for symbol in stock_weights.keys():
        # Find the matching stock in portfolio_stocks
        matching_stock = None
        for stock in portfolio_stocks:
            if normalize_stock_symbol(stock.get('stockName', '')) == symbol:
                matching_stock = stock
                break
        
        if not matching_stock or symbol not in all_returns_data:
            continue

        # Get the values
        quantity = int(matching_stock.get('quantity', 0))
        buy_price = int(matching_stock.get('buyPrice', 0))
        returns = all_returns_data[symbol]
        position_value = stock_weights[symbol] * portfolio_value
        
        # Get current price from our dataframe
        current_price = None
        try:
            csv_path = stock_file_mapping[symbol]["path"]
            df = pd.read_csv(csv_path)
            if 'Close' in df.columns:
                current_price = pd.to_numeric(df['Close'], errors='coerce').dropna().iloc[-1]
            else:
                # Find a suitable price column
                for col in df.columns:
                    if 'close' in col.lower() or 'price' in col.lower():
                        current_price = pd.to_numeric(df[col], errors='coerce').dropna().iloc[-1]
                        break
                
                # If still not found, try the third column
                if current_price is None and len(df.columns) >= 3:
                    current_price = pd.to_numeric(df.iloc[:, 2], errors='coerce').dropna().iloc[-1]
        except Exception as e:
            print(f"Error getting current price for {symbol}: {str(e)}")
            current_price = 0

        try:
            # Perform a quick one-step backtest on the last 20% of the series
            series = returns.dropna()
            n = len(series)
            if n < 30:
                raise ValueError('Not enough data for backtest')
            start_idx = int(n * 0.8)
            actuals = []
            preds_trend = []
            preds_lag1 = []
            preds_rf = []
            insample = series.iloc[:start_idx]

            for t in range(start_idx, n - 1):
                hist = series.iloc[:t]
                next_actual = float(series.iloc[t + 1])
                actuals.append(next_actual)
                # Trend prediction
                try:
                    trend_pred = simple_trend_forecast(hist.values)
                except Exception:
                    trend_pred = float(hist.iloc[-1])
                preds_trend.append(trend_pred)
                # Lag1 prediction
                lag1_pred = float(hist.iloc[-1])
                preds_lag1.append(lag1_pred)
                # RF prediction if model available (optional)
                if rf_model is not None:
                    try:
                        # Build very simple feature vector: last 5 returns
                        lags = np.array(hist.tail(5).tolist()[::-1])
                        if len(lags) < 5:
                            lags = np.pad(lags, (0, 5 - len(lags)), 'constant')
                        feat = lags.reshape(1, -1)
                        rf_p = float(rf_model.predict(feat)[0])
                    except Exception:
                        rf_p = trend_pred
                    preds_rf.append(rf_p)

            actuals_arr = np.array(actuals)
            preds_trend_arr = np.array(preds_trend)
            preds_lag1_arr = np.array(preds_lag1)

            model_performance = {
                'Trend': {
                    'MAE': _mae(actuals_arr, preds_trend_arr),
                    'RMSE': _rmse(actuals_arr, preds_trend_arr),
                    'MASE': _mase(actuals_arr, preds_trend_arr, insample.values),
                    'classification': _classification_metrics(actuals_arr, preds_trend_arr)
                },
                'Lag1': {
                    'MAE': _mae(actuals_arr, preds_lag1_arr),
                    'RMSE': _rmse(actuals_arr, preds_lag1_arr),
                    'MASE': _mase(actuals_arr, preds_lag1_arr, insample.values),
                    'classification': _classification_metrics(actuals_arr, preds_lag1_arr)
                }
            }

            if rf_model is not None and len(preds_rf) > 0:
                preds_rf_arr = np.array(preds_rf)
                model_performance['RandomForest'] = {
                    'MAE': _mae(actuals_arr, preds_rf_arr),
                    'RMSE': _rmse(actuals_arr, preds_rf_arr),
                    'MASE': _mase(actuals_arr, preds_rf_arr, insample.values),
                    'classification': _classification_metrics(actuals_arr, preds_rf_arr)
                }

            # Use Trend forecast mean as a simple multi-day forecast proxy
            forecast_return = float(np.mean(preds_trend_arr)) if len(preds_trend_arr) > 0 else 0.0

            stock_results[matching_stock.get('stockName', symbol)] = {
                'quantity': int(quantity),
                'current_price': float(current_price) if current_price is not None else 0,
                'buy_price': int(buy_price),
                'position_value': float(position_value),
                'weight': float(stock_weights[symbol]),
                'profit_loss': float((current_price - buy_price) * quantity) if current_price is not None else 0,
                'roi': float(((current_price - buy_price) / buy_price) * 100) if buy_price > 0 and current_price is not None else 0,
                'max_drawdown': float(calculate_max_drawdown(returns)),
                'forecast_return': forecast_return,
                'performance': model_performance
            }

        except Exception as e:
            print(f"Error processing forecasts for {symbol}: {str(e)}")
            continue

    if stock_results:
        # Portfolio metrics
        # Use the first stock's returns index as a base
        if all_returns_data:
            first_symbol = list(all_returns_data.keys())[0]
            reference_index = all_returns_data[first_symbol].index
            portfolio_returns = pd.Series(0, index=reference_index)
            
            for symbol, weight in stock_weights.items():
                if symbol in all_returns_data:
                    # Align the index of each stock's returns with our reference
                    aligned_returns = all_returns_data[symbol].reindex(reference_index, fill_value=0)
                    portfolio_returns += aligned_returns * weight

            portfolio_var = calculate_var(portfolio_returns, portfolio_value, confidence_level * 100)
            portfolio_cvar = calculate_cvar(portfolio_returns, portfolio_value, confidence_level * 100)
            portfolio_sharpe = calculate_sharpe_ratio(portfolio_returns)
            portfolio_max_drawdown = calculate_max_drawdown(portfolio_returns)

            output = {
                "portfolio_summary": {
                    "Total Portfolio Value": f"₹{portfolio_value:,.2f}",
                    "Total Profit/Loss": f"₹{total_profit_loss:,.2f}",
                    "Portfolio Return": f"{(total_profit_loss / portfolio_value) * 100:.2f}%" if portfolio_value > 0 else "0.00%",
                    "Value at Risk (VaR)": f"₹{abs(portfolio_var):,.2f}",
                    "Conditional VaR (CVaR)": f"₹{abs(portfolio_cvar):,.2f}",
                    "Sharpe Ratio": round(portfolio_sharpe, 2),
                    "Maximum Drawdown": f"{abs(portfolio_max_drawdown):.2f}%",
                    "Risk Level": "High" if portfolio_sharpe < 0.5 else "Moderate" if portfolio_sharpe < 1 else "Low",
                    "Recommendation": "Hold" if portfolio_sharpe > 1 else "Consider rebalancing"
                },
                "individual_stocks": stock_results
            }
            return output
        else:
            return {"error": "No valid return data found for portfolio."}
    else:
        return {"error": "No valid stock data found for portfolio."}