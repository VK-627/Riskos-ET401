"""
Advanced forecasting models for RISKOS portfolio prediction
Includes LSTM, Prophet, and ensemble methods
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Try to import advanced libraries
try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_squared_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

class AdvancedForecaster:
    """Advanced forecasting using multiple models"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
    
    def prepare_data(self, returns: pd.Series, lookback: int = 30) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for machine learning models"""
        data = returns.values.reshape(-1, 1)
        
        # Normalize data
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(data)
        
        # Create sequences
        X, y = [], []
        for i in range(lookback, len(scaled_data)):
            X.append(scaled_data[i-lookback:i, 0])
            y.append(scaled_data[i, 0])
        
        return np.array(X), np.array(y), scaler
    
    def lstm_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """LSTM-based forecasting"""
        if not TENSORFLOW_AVAILABLE:
            raise RuntimeError("TensorFlow not available for LSTM forecasting")
        
        try:
            # Prepare data
            X, y, scaler = self.prepare_data(returns, lookback=30)
            
            if len(X) < 50:  # Need sufficient data
                raise ValueError("Insufficient data for LSTM")
            
            # Reshape for LSTM
            X = X.reshape((X.shape[0], X.shape[1], 1))
            
            # Split data
            train_size = int(len(X) * 0.8)
            X_train, X_test = X[:train_size], X[train_size:]
            y_train, y_test = y[:train_size], y[train_size:]
            
            # Build LSTM model
            model = Sequential([
                LSTM(50, return_sequences=True, input_shape=(X.shape[1], 1)),
                Dropout(0.2),
                LSTM(50, return_sequences=False),
                Dropout(0.2),
                Dense(25),
                Dense(1)
            ])
            
            model.compile(optimizer='adam', loss='mean_squared_error')
            
            # Train model
            model.fit(X_train, y_train, batch_size=32, epochs=50, verbose=0)
            
            # Make predictions
            last_sequence = X[-1].reshape(1, X.shape[1], 1)
            predictions = []
            
            for _ in range(forecast_days):
                pred = model.predict(last_sequence, verbose=0)
                predictions.append(pred[0, 0])
                
                # Update sequence
                last_sequence = np.roll(last_sequence, -1, axis=1)
                last_sequence[0, -1, 0] = pred[0, 0]
            
            # Inverse transform
            predictions = np.array(predictions).reshape(-1, 1)
            predictions = scaler.inverse_transform(predictions).flatten()
            
            return predictions
            
        except Exception as e:
            print(f"LSTM forecasting error: {e}")
            # Fallback to simple trend
            return self.simple_trend_forecast(returns, forecast_days)
    
    def prophet_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Prophet-based forecasting"""
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet not available for forecasting")
        
        try:
            # Prepare data for Prophet
            df = pd.DataFrame({
                'ds': returns.index,
                'y': returns.values
            })
            
            # Initialize and fit Prophet
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative'
            )
            
            model.fit(df)
            
            # Make future predictions
            future = model.make_future_dataframe(periods=forecast_days)
            forecast = model.predict(future)
            
            # Extract forecast values
            predictions = forecast['yhat'].tail(forecast_days).values
            
            return predictions
            
        except Exception as e:
            print(f"Prophet forecasting error: {e}")
            # Fallback to simple trend
            return self.simple_trend_forecast(returns, forecast_days)
    
    def ensemble_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Ensemble forecasting using multiple models"""
        predictions = []
        weights = []
        
        # ARIMA forecast
        try:
            from statsmodels.tsa.arima.model import ARIMA
            arima_model = ARIMA(returns, order=(1, 0, 1))
            arima_fit = arima_model.fit()
            arima_pred = arima_fit.forecast(steps=forecast_days)
            predictions.append(arima_pred.values)
            weights.append(0.3)
        except:
            pass
        
        # LSTM forecast
        if TENSORFLOW_AVAILABLE:
            try:
                lstm_pred = self.lstm_forecast(returns, forecast_days)
                predictions.append(lstm_pred)
                weights.append(0.4)
            except:
                pass
        
        # Prophet forecast
        if PROPHET_AVAILABLE:
            try:
                prophet_pred = self.prophet_forecast(returns, forecast_days)
                predictions.append(prophet_pred)
                weights.append(0.3)
            except:
                pass
        
        # Simple trend as fallback
        if not predictions:
            trend_pred = self.simple_trend_forecast(returns, forecast_days)
            predictions.append(trend_pred)
            weights.append(1.0)
        
        # Weighted average
        weights = np.array(weights)
        weights = weights / weights.sum()  # Normalize weights
        
        ensemble_pred = np.zeros(forecast_days)
        for pred, weight in zip(predictions, weights):
            ensemble_pred += pred * weight
        
        return ensemble_pred
    
    def simple_trend_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Simple trend-based forecasting as fallback"""
        # Calculate recent trend
        recent_returns = returns.tail(30)
        trend = recent_returns.mean()
        volatility = recent_returns.std()
        
        # Generate forecast with trend and noise
        forecast = np.random.normal(trend, volatility, forecast_days)
        
        return forecast
    
    def advanced_volatility_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Advanced volatility forecasting using GARCH variants"""
        try:
            from arch import arch_model
            
            # Try different GARCH models
            models = [
                arch_model(returns, vol='Garch', p=1, q=1),
                arch_model(returns, vol='EGARCH', p=1, q=1),
                arch_model(returns, vol='GARCH', p=2, q=2)
            ]
            
            best_model = None
            best_aic = float('inf')
            
            for model in models:
                try:
                    fitted = model.fit(disp='off')
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_model = fitted
                except:
                    continue
            
            if best_model is None:
                # Fallback to simple volatility
                return np.full(forecast_days, returns.std())
            
            # Forecast volatility
            forecast_result = best_model.forecast(horizon=forecast_days, reindex=False)
            volatility_forecast = np.sqrt(forecast_result.variance.values[-1, :])
            
            return volatility_forecast
            
        except Exception as e:
            print(f"Advanced volatility forecasting error: {e}")
            # Fallback to simple volatility
            return np.full(forecast_days, returns.std())

def enhanced_portfolio_forecast(returns_data: Dict[str, pd.Series], 
                               portfolio_weights: Dict[str, float],
                               forecast_days: int = 30,
                               confidence_level: float = 0.95) -> Dict:
    """Enhanced portfolio forecasting with multiple models"""
    
    forecaster = AdvancedForecaster()
    results = {}
    
    for symbol, returns in returns_data.items():
        try:
            # Ensemble forecast for returns
            return_forecast = forecaster.ensemble_forecast(returns, forecast_days)
            
            # Advanced volatility forecast
            volatility_forecast = forecaster.advanced_volatility_forecast(returns, forecast_days)
            
            # Calculate risk metrics
            z_score = stats.norm.ppf(1 - confidence_level)
            var_forecast = return_forecast.mean() + (z_score * volatility_forecast.mean())
            
            results[symbol] = {
                'return_forecast': return_forecast,
                'volatility_forecast': volatility_forecast,
                'var_forecast': var_forecast,
                'expected_return': return_forecast.mean(),
                'expected_volatility': volatility_forecast.mean()
            }
            
        except Exception as e:
            print(f"Error forecasting {symbol}: {e}")
            # Fallback to simple forecast
            simple_forecast = forecaster.simple_trend_forecast(returns, forecast_days)
            results[symbol] = {
                'return_forecast': simple_forecast,
                'volatility_forecast': np.full(forecast_days, returns.std()),
                'var_forecast': simple_forecast.mean() + (stats.norm.ppf(1 - confidence_level) * returns.std()),
                'expected_return': simple_forecast.mean(),
                'expected_volatility': returns.std()
            }
    
    return results
