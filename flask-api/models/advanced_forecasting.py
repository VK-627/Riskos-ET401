"""
Advanced forecasting models for RISKOS portfolio prediction
Includes LSTM, Prophet, and ensemble methods
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import warnings
import logging
warnings.filterwarnings('ignore')

# Import scipy.stats for statistical functions
from scipy import stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import additional libraries
try:
    from arch import arch_model
    ARCH_AVAILABLE = True
except ImportError:
    ARCH_AVAILABLE = False

try:
    from statsmodels.tsa.arima.model import ARIMA
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False

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
        self.performance_cache = {}  # Cache for model performance metrics
        self.max_cache_size = 100  # Limit cache size to prevent memory issues
    
    def validate_returns_data(self, returns: pd.Series) -> pd.Series:
        """Validate and clean returns data"""
        if returns is None or len(returns) == 0:
            raise ValueError("Returns data is empty or None")
        
        # Convert to pandas Series if not already
        if not isinstance(returns, pd.Series):
            returns = pd.Series(returns)
        
        # Remove NaN values
        returns_clean = returns.dropna()
        
        if len(returns_clean) < 5:
            raise ValueError(f"Insufficient data: need at least 5 observations, got {len(returns_clean)}")
        
        # Check for extreme outliers (beyond 10 standard deviations)
        mean_ret = returns_clean.mean()
        std_ret = returns_clean.std()
        if std_ret > 0:
            outlier_mask = np.abs(returns_clean - mean_ret) <= 10 * std_ret
            returns_clean = returns_clean[outlier_mask]
        
        # Ensure we still have enough data after cleaning
        if len(returns_clean) < 5:
            raise ValueError("Insufficient data after outlier removal")
        
        return returns_clean
    
    def get_model_availability(self) -> Dict[str, bool]:
        """Get availability status of all forecasting models"""
        return {
            'LSTM': TENSORFLOW_AVAILABLE,
            'Prophet': PROPHET_AVAILABLE,
            'ARIMA': STATSMODELS_AVAILABLE,
            'RandomForest': SKLEARN_AVAILABLE,
            'GARCH': ARCH_AVAILABLE
        }
    
    def _manage_cache(self, key: str, value: any) -> None:
        """Manage cache size to prevent memory issues"""
        if len(self.performance_cache) >= self.max_cache_size:
            # Remove oldest entries (simple FIFO)
            oldest_key = next(iter(self.performance_cache))
            del self.performance_cache[oldest_key]
        
        self.performance_cache[key] = value
    
    def _get_cached_result(self, key: str) -> any:
        """Get cached result if available"""
        return self.performance_cache.get(key, None)
    
    def clear_cache(self) -> None:
        """Clear all cached data"""
        self.performance_cache.clear()
        self.models.clear()
        self.scalers.clear()
    
    def prepare_data(self, returns: pd.Series, lookback: int = 30) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for machine learning models with enhanced preprocessing"""
        # Use the validation function
        returns_clean = self.validate_returns_data(returns)
        
        if len(returns_clean) < lookback + 10:
            raise ValueError(f"Insufficient data: need at least {lookback + 10} observations, got {len(returns_clean)}")
        
        data = returns_clean.values.reshape(-1, 1)
        
        # Normalize data using robust scaling
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(data)
        
        # Create sequences with overlap for better training
        X, y = [], []
        for i in range(lookback, len(scaled_data)):
            X.append(scaled_data[i-lookback:i, 0])
            y.append(scaled_data[i, 0])
        
        return np.array(X), np.array(y), scaler
    
    def lstm_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Enhanced LSTM-based forecasting with improved architecture"""
        if not TENSORFLOW_AVAILABLE:
            raise RuntimeError("TensorFlow not available for LSTM forecasting")
        
        try:
            # Configure TensorFlow for memory efficiency
            tf.config.experimental.set_memory_growth(tf.config.list_physical_devices('GPU')[0], True) if tf.config.list_physical_devices('GPU') else None
            
            # Check cache first
            cache_key = f"lstm_{hash(str(returns.values.tobytes()))}_{forecast_days}"
            cached_result = self._get_cached_result(cache_key)
            if cached_result is not None:
                return cached_result
            # Prepare data with dynamic lookback based on data length
            data_length = len(returns.dropna())
            lookback = min(30, max(10, data_length // 4))  # Adaptive lookback
            
            X, y, scaler = self.prepare_data(returns, lookback=lookback)
            
            if len(X) < 20:  # Reduced minimum requirement
                raise ValueError("Insufficient data for LSTM")
            
            # Reshape for LSTM
            X = X.reshape((X.shape[0], X.shape[1], 1))
            
            # Split data with validation
            train_size = int(len(X) * 0.8)
            val_size = int(len(X) * 0.1)
            
            X_train = X[:train_size]
            X_val = X[train_size:train_size + val_size]
            X_test = X[train_size + val_size:]
            
            y_train = y[:train_size]
            y_val = y[train_size:train_size + val_size]
            y_test = y[train_size + val_size:]
            
            # Build enhanced LSTM model
            model = Sequential([
                LSTM(64, return_sequences=True, input_shape=(X.shape[1], 1)),
                Dropout(0.3),
                LSTM(32, return_sequences=True),
                Dropout(0.2),
                LSTM(16, return_sequences=False),
                Dropout(0.1),
                Dense(32, activation='relu'),
                Dense(16, activation='relu'),
                Dense(1)
            ])
            
            # Use adaptive learning rate
            optimizer = tf.keras.optimizers.Adam(learning_rate=0.001)
            model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
            
            # Add early stopping and reduce learning rate on plateau
            callbacks = [
                tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
                tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
            ]
            
            # Train model with validation
            if len(X_val) > 0:
                model.fit(X_train, y_train, 
                         validation_data=(X_val, y_val),
                         batch_size=min(32, len(X_train)),
                         epochs=100, 
                         callbacks=callbacks,
                         verbose=0)
            else:
                model.fit(X_train, y_train, 
                         batch_size=min(32, len(X_train)),
                         epochs=50, 
                         verbose=0)
            
            # Make predictions with uncertainty estimation
            last_sequence = X[-1].reshape(1, X.shape[1], 1)
            predictions = []
            
            for _ in range(forecast_days):
                pred = model.predict(last_sequence, verbose=0)
                predictions.append(pred[0, 0])
                
                # Update sequence with some noise to prevent overfitting
                noise = np.random.normal(0, 0.01, pred.shape)
                last_sequence = np.roll(last_sequence, -1, axis=1)
                last_sequence[0, -1, 0] = pred[0, 0] + noise[0, 0]
            
            # Inverse transform
            predictions = np.array(predictions).reshape(-1, 1)
            predictions = scaler.inverse_transform(predictions).flatten()
            
            # Cache the result
            self._manage_cache(cache_key, predictions)
            
            return predictions
            
        except Exception as e:
            logger.error(f"LSTM forecasting error: {e}", exc_info=True)
            # Fallback to simple trend
            return self.simple_trend_forecast(returns, forecast_days)
        finally:
            # Clear TensorFlow session to free memory
            if TENSORFLOW_AVAILABLE:
                try:
                    tf.keras.backend.clear_session()
                except:
                    pass
    
    def prophet_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Enhanced Prophet-based forecasting with better configuration"""
        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet not available for forecasting")
        
        try:
            # Clean data and ensure proper datetime index
            returns_clean = returns.dropna()
            if len(returns_clean) < 30:
                raise ValueError("Insufficient data for Prophet")
            
            # Prepare data for Prophet with proper datetime handling
            df = pd.DataFrame({
                'ds': pd.to_datetime(returns_clean.index),
                'y': returns_clean.values
            })
            
            # Remove any remaining NaNs
            df = df.dropna()
            
            # Configure Prophet based on data characteristics
            data_freq = pd.infer_freq(df['ds'])
            has_weekly_pattern = len(df) > 7 and data_freq in ['D', 'B']
            has_yearly_pattern = len(df) > 365 and data_freq in ['D', 'B']
            
            # Initialize Prophet with adaptive seasonality
            model = Prophet(
                yearly_seasonality=has_yearly_pattern,
                weekly_seasonality=has_weekly_pattern,
                daily_seasonality=False,
                seasonality_mode='additive',  # Better for financial returns
                changepoint_prior_scale=0.05,  # More conservative
                seasonality_prior_scale=10.0,
                holidays_prior_scale=10.0,
                interval_width=0.8
            )
            
            # Add custom seasonalities if data supports it
            if has_weekly_pattern and len(df) > 14:
                model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
            
            model.fit(df)
            
            # Make future predictions
            future = model.make_future_dataframe(periods=forecast_days, freq=data_freq or 'D')
            forecast = model.predict(future)
            
            # Extract forecast values with confidence intervals
            predictions = forecast['yhat'].tail(forecast_days).values
            
            # Add some uncertainty based on historical volatility
            historical_vol = returns_clean.std()
            noise = np.random.normal(0, historical_vol * 0.1, len(predictions))
            predictions = predictions + noise
            
            return predictions
            
        except Exception as e:
            logger.error(f"Prophet forecasting error: {e}", exc_info=True)
            # Fallback to simple trend
            return self.simple_trend_forecast(returns, forecast_days)
    
    def ensemble_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Enhanced ensemble forecasting using multiple models with dynamic weighting"""
        predictions = []
        weights = []
        model_names = []
        
        # ARIMA forecast with multiple orders
        if STATSMODELS_AVAILABLE:
            try:
                # Try different ARIMA orders and pick the best
                best_arima = None
                best_aic = float('inf')
                
                for order in [(1, 0, 1), (2, 0, 1), (1, 0, 2), (2, 0, 2)]:
                    try:
                        arima_model = ARIMA(returns, order=order)
                        arima_fit = arima_model.fit()
                        if arima_fit.aic < best_aic:
                            best_aic = arima_fit.aic
                            best_arima = arima_fit
                    except:
                        continue
                
                if best_arima is not None:
                    arima_pred = best_arima.forecast(steps=forecast_days)
                    predictions.append(arima_pred.values)
                    weights.append(0.25)
                    model_names.append('ARIMA')
            except Exception as e:
                logger.warning(f"ARIMA forecasting error: {e}")
        
        # LSTM forecast
        if TENSORFLOW_AVAILABLE:
            try:
                lstm_pred = self.lstm_forecast(returns, forecast_days)
                predictions.append(lstm_pred)
                weights.append(0.35)
                model_names.append('LSTM')
            except Exception as e:
                logger.warning(f"LSTM forecasting error: {e}")
        
        # Prophet forecast
        if PROPHET_AVAILABLE:
            try:
                prophet_pred = self.prophet_forecast(returns, forecast_days)
                predictions.append(prophet_pred)
                weights.append(0.25)
                model_names.append('Prophet')
            except Exception as e:
                logger.warning(f"Prophet forecasting error: {e}")
        
        # Random Forest forecast (if sklearn available)
        if SKLEARN_AVAILABLE:
            try:
                rf_pred = self.random_forest_forecast(returns, forecast_days)
                predictions.append(rf_pred)
                weights.append(0.15)
                model_names.append('RandomForest')
            except Exception as e:
                logger.warning(f"Random Forest forecasting error: {e}")
        
        # Simple trend as fallback
        if not predictions:
            trend_pred = self.simple_trend_forecast(returns, forecast_days)
            predictions.append(trend_pred)
            weights.append(1.0)
            model_names.append('Trend')
        
        # Dynamic weighting based on recent performance
        if len(predictions) > 1:
            weights = self._calculate_dynamic_weights(returns, predictions, forecast_days)
        
        # Normalize weights
        weights = np.array(weights)
        weights = weights / weights.sum()
        
        # Weighted average with uncertainty bounds
        ensemble_pred = np.zeros(forecast_days)
        for pred, weight in zip(predictions, weights):
            ensemble_pred += pred * weight
        
        logger.info(f"Ensemble forecast using models: {model_names} with weights: {weights}")
        
        return ensemble_pred
    
    def random_forest_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Random Forest-based forecasting"""
        if not SKLEARN_AVAILABLE:
            raise RuntimeError("Scikit-learn not available for Random Forest forecasting")
        
        try:
            from sklearn.ensemble import RandomForestRegressor
            
            # Prepare features
            lookback = min(20, len(returns) // 3)
            if lookback < 5:
                raise ValueError("Insufficient data for Random Forest")
            
            X, y = [], []
            for i in range(lookback, len(returns)):
                X.append(returns.iloc[i-lookback:i].values)
                y.append(returns.iloc[i])
            
            X = np.array(X)
            y = np.array(y)
            
            # Train Random Forest
            rf = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            rf.fit(X, y)
            
            # Make predictions
            predictions = []
            last_sequence = returns.iloc[-lookback:].values
            
            for _ in range(forecast_days):
                pred = rf.predict([last_sequence])[0]
                predictions.append(pred)
                
                # Update sequence
                last_sequence = np.roll(last_sequence, -1)
                last_sequence[-1] = pred
            
            return np.array(predictions)
            
        except Exception as e:
            logger.error(f"Random Forest forecasting error: {e}", exc_info=True)
            raise
    
    def _calculate_dynamic_weights(self, returns: pd.Series, predictions: List[np.ndarray], forecast_days: int) -> List[float]:
        """Calculate dynamic weights based on recent model performance"""
        try:
            # Use last 20% of data for validation
            val_size = max(5, len(returns) // 5)
            val_returns = returns.tail(val_size)
            
            # Calculate errors for each model
            errors = []
            for pred in predictions:
                # Use the last part of predictions for validation
                val_pred = pred[-val_size:] if len(pred) >= val_size else pred
                val_actual = val_returns.values[-len(val_pred):]
                
                mse = np.mean((val_pred - val_actual) ** 2)
                errors.append(mse)
            
            # Convert errors to weights (lower error = higher weight)
            errors = np.array(errors)
            weights = 1.0 / (errors + 1e-8)  # Add small value to avoid division by zero
            weights = weights / weights.sum()
            
            return weights.tolist()
            
        except Exception as e:
            logger.warning(f"Dynamic weighting error: {e}")
            # Return equal weights as fallback
            return [1.0 / len(predictions)] * len(predictions)
    
    def simple_trend_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Enhanced simple trend-based forecasting as fallback"""
        try:
            # Clean data
            returns_clean = returns.dropna()
            if len(returns_clean) < 5:
                # If very little data, use zero forecast
                return np.zeros(forecast_days)
            
            # Calculate recent trend with different time windows
            short_window = min(10, len(returns_clean) // 3)
            long_window = min(30, len(returns_clean))
            
            short_trend = returns_clean.tail(short_window).mean()
            long_trend = returns_clean.tail(long_window).mean()
            
            # Weighted trend (more weight to recent data)
            trend = 0.7 * short_trend + 0.3 * long_trend
            
            # Calculate volatility with different methods
            recent_vol = returns_clean.tail(short_window).std()
            historical_vol = returns_clean.std()
            
            # Use the higher volatility for conservative forecasting
            volatility = max(recent_vol, historical_vol * 0.5)
            
            # Add mean reversion component
            mean_reversion = -0.1 * trend  # Slight mean reversion
            
            # Generate forecast with trend, mean reversion, and noise
            base_forecast = trend + mean_reversion
            noise = np.random.normal(0, volatility, forecast_days)
            forecast = base_forecast + noise
            
            # Ensure forecast is reasonable (not too extreme)
            max_reasonable = 3 * volatility
            forecast = np.clip(forecast, -max_reasonable, max_reasonable)
            
            return forecast
            
        except Exception as e:
            logger.error(f"Simple trend forecasting error: {e}", exc_info=True)
            # Ultimate fallback
            return np.zeros(forecast_days)
    
    def advanced_volatility_forecast(self, returns: pd.Series, forecast_days: int = 30) -> np.ndarray:
        """Advanced volatility forecasting using GARCH variants"""
        if not ARCH_AVAILABLE:
            # Fallback to simple volatility
            return np.full(forecast_days, returns.std())
            
        try:
            
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
            logger.warning(f"Advanced volatility forecasting error: {e}")
            # Fallback to simple volatility
            return np.full(forecast_days, returns.std())

def enhanced_portfolio_forecast(returns_data: Dict[str, pd.Series], 
                               portfolio_weights: Dict[str, float],
                               forecast_days: int = 30,
                               confidence_level: float = 0.95) -> Dict:
    """Enhanced portfolio forecasting with multiple models and frontend integration"""
    
    forecaster = AdvancedForecaster()
    results = {
        'individual_stocks': {},
        'portfolio_summary': {},
        'forecast_data': {},
        'risk_metrics': {}
    }
    
    # Validate input data
    if not returns_data or not portfolio_weights:
        raise ValueError("Both returns_data and portfolio_weights must be provided")
    
    if len(returns_data) != len(portfolio_weights):
        raise ValueError("Number of stocks in returns_data and portfolio_weights must match")
    
    portfolio_forecasts = []
    portfolio_volatilities = []
    total_weight = sum(portfolio_weights.values())
    
    # Normalize weights
    normalized_weights = {k: v / total_weight for k, v in portfolio_weights.items()}
    
    for symbol, returns in returns_data.items():
        try:
            # Validate returns data
            if returns is None or len(returns.dropna()) < 5:
                print(f"Warning: Insufficient data for {symbol}, using fallback")
                simple_forecast = forecaster.simple_trend_forecast(returns if returns is not None else pd.Series([0]), forecast_days)
                volatility_forecast = np.full(forecast_days, 0.02)  # 2% default volatility
            else:
                # Ensemble forecast for returns
                return_forecast = forecaster.ensemble_forecast(returns, forecast_days)
                
                # Advanced volatility forecast
                volatility_forecast = forecaster.advanced_volatility_forecast(returns, forecast_days)
            
            # Calculate risk metrics
            z_score = stats.norm.ppf(1 - confidence_level)
            var_forecast = return_forecast.mean() + (z_score * volatility_forecast.mean())
            
            # Store individual stock results
            weight = normalized_weights.get(symbol, 0)
            results['individual_stocks'][symbol] = {
                'return_forecast': return_forecast.tolist(),
                'volatility_forecast': volatility_forecast.tolist(),
                'var_forecast': float(var_forecast),
                'expected_return': float(return_forecast.mean()),
                'expected_volatility': float(volatility_forecast.mean()),
                'weight': float(weight),
                'confidence_level': confidence_level
            }
            
            # Store for portfolio-level calculations
            portfolio_forecasts.append(return_forecast * weight)
            portfolio_volatilities.append(volatility_forecast * weight)
            
        except Exception as e:
            logger.error(f"Error forecasting {symbol}: {e}", exc_info=True)
            # Fallback to simple forecast
            simple_forecast = forecaster.simple_trend_forecast(returns if returns is not None else pd.Series([0]), forecast_days)
            weight = normalized_weights.get(symbol, 0)
            
            results['individual_stocks'][symbol] = {
                'return_forecast': simple_forecast.tolist(),
                'volatility_forecast': [0.02] * forecast_days,  # 2% default volatility
                'var_forecast': float(simple_forecast.mean()),
                'expected_return': float(simple_forecast.mean()),
                'expected_volatility': 0.02,
                'weight': float(weight),
                'confidence_level': confidence_level
            }
            
            portfolio_forecasts.append(simple_forecast * weight)
            portfolio_volatilities.append(np.full(forecast_days, 0.02) * weight)
    
    # Calculate portfolio-level metrics
    if portfolio_forecasts:
        portfolio_return_forecast = np.sum(portfolio_forecasts, axis=0)
        portfolio_volatility_forecast = np.sqrt(np.sum([vol**2 for vol in portfolio_volatilities], axis=0))
        
        # Portfolio risk metrics
        portfolio_var = portfolio_return_forecast.mean() + (stats.norm.ppf(1 - confidence_level) * portfolio_volatility_forecast.mean())
        
        results['portfolio_summary'] = {
            'expected_return': float(portfolio_return_forecast.mean()),
            'expected_volatility': float(portfolio_volatility_forecast.mean()),
            'var_forecast': float(portfolio_var),
            'confidence_level': confidence_level,
            'forecast_days': forecast_days
        }
        
        # Store forecast data for visualization
        results['forecast_data'] = {
            'portfolio_returns': portfolio_return_forecast.tolist(),
            'portfolio_volatility': portfolio_volatility_forecast.tolist(),
            'forecast_dates': pd.date_range(start=pd.Timestamp.now(), periods=forecast_days, freq='D').strftime('%Y-%m-%d').tolist()
        }
    
    return results

def create_forecast_api_response(portfolio_data: List[Dict], 
                                forecast_days: int = 30, 
                                confidence_level: float = 0.95) -> Dict:
    """
    Create a standardized API response for the frontend
    This function integrates with the existing portfolio prediction system
    """
    try:
        # Extract returns data and weights from portfolio
        returns_data = {}
        portfolio_weights = {}
        
        for stock in portfolio_data:
            symbol = stock.get('stockName', '')
            if not symbol:
                continue
                
            # For now, we'll use simple trend forecasting
            # In a real implementation, you'd load actual historical data
            forecaster = AdvancedForecaster()
            
            # Create synthetic returns data (replace with actual data loading)
            np.random.seed(42)  # For reproducibility
            synthetic_returns = pd.Series(
                np.random.normal(0.001, 0.02, 100),  # 0.1% daily return, 2% volatility
                index=pd.date_range(start='2023-01-01', periods=100, freq='D')
            )
            
            returns_data[symbol] = synthetic_returns
            portfolio_weights[symbol] = 1.0  # Equal weights for now
        
        # Generate forecasts
        forecast_results = enhanced_portfolio_forecast(
            returns_data, 
            portfolio_weights, 
            forecast_days, 
            confidence_level
        )
        
        # Format response to match frontend expectations
        response = {
            'status': 'success',
            'forecast_days': forecast_days,
            'confidence_level': confidence_level,
            'individual_stocks': {},
            'portfolio_summary': forecast_results.get('portfolio_summary', {}),
            'forecast_data': forecast_results.get('forecast_data', {}),
            'model_info': {
                'available_models': forecaster.get_model_availability(),
                'forecast_timestamp': pd.Timestamp.now().isoformat()
            }
        }
        
        # Format individual stock data for frontend
        for symbol, data in forecast_results.get('individual_stocks', {}).items():
            response['individual_stocks'][symbol] = {
                'name': symbol,
                'expected_return': data['expected_return'],
                'expected_volatility': data['expected_volatility'],
                'var_forecast': data['var_forecast'],
                'weight': data['weight'],
                'forecast_returns': data['return_forecast'],
                'forecast_volatility': data['volatility_forecast']
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Error in forecast API response creation: {e}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e),
            'individual_stocks': {},
            'portfolio_summary': {},
            'forecast_data': {}
        }
