"""
Multi-provider data fetching system for RISKOS
Supports Yahoo Finance, Alpha Vantage, and Tiingo APIs
"""

import os
import time
import requests
import pandas as pd
from functools import lru_cache
from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import yfinance
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    logger.warning("yfinance not available")

class DataProvider:
    """Base class for data providers"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.rate_limit_delay = 0.1  # 100ms between requests
    
    def fetch_data(self, symbol: str, period: str = "5y") -> Optional[pd.Series]:
        """Fetch historical data for a symbol"""
        raise NotImplementedError
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for a symbol"""
        raise NotImplementedError

class YahooFinanceProvider(DataProvider):
    """Yahoo Finance data provider"""
    
    def __init__(self):
        super().__init__()
        if not YFINANCE_AVAILABLE:
            raise RuntimeError("yfinance not installed. Run: pip install yfinance")
    
    def _ensure_nse_symbol(self, symbol: str) -> str:
        """Ensure symbol has .NS suffix for NSE"""
        if not symbol:
            return ""
        s = str(symbol).strip().upper()
        return s if s.endswith(".NS") else f"{s}.NS"
    
    @lru_cache(maxsize=256)
    def fetch_data(self, symbol: str, period: str = "5y") -> Optional[pd.Series]:
        """Fetch historical close prices from Yahoo Finance"""
        try:
            sym = self._ensure_nse_symbol(symbol)
            ticker = yf.Ticker(sym)
            df = ticker.history(period=period, auto_adjust=False)
            
            if df.empty:
                logger.warning(f"No data returned for {sym}")
                return None
            
            # Return close prices as Series
            series = pd.to_numeric(df['Close'], errors='coerce').dropna()
            series.index = pd.to_datetime(series.index)
            logger.info(f"Fetched {len(series)} days of data for {sym}")
            return series
            
        except Exception as e:
            logger.error(f"Yahoo Finance error for {symbol}: {str(e)}")
            return None
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price from Yahoo Finance"""
        try:
            sym = self._ensure_nse_symbol(symbol)
            ticker = yf.Ticker(sym)
            info = ticker.info
            return info.get('currentPrice') or info.get('regularMarketPrice')
        except Exception as e:
            logger.error(f"Error getting current price for {symbol}: {str(e)}")
            return None

class AlphaVantageProvider(DataProvider):
    """Alpha Vantage data provider"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.api_key = api_key or os.getenv('ALPHA_VANTAGE_API_KEY')
        self.base_url = "https://www.alphavantage.co/query"
        self.rate_limit_delay = 12  # Alpha Vantage free tier: 5 calls/minute
    
    def fetch_data(self, symbol: str, period: str = "5y") -> Optional[pd.Series]:
        """Fetch historical data from Alpha Vantage"""
        if not self.api_key:
            logger.warning("Alpha Vantage API key not provided")
            return None
        
        try:
            # Remove .NS suffix for Alpha Vantage
            clean_symbol = symbol.replace('.NS', '')
            
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': clean_symbol,
                'outputsize': 'full',
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if 'Error Message' in data:
                logger.error(f"Alpha Vantage error: {data['Error Message']}")
                return None
            
            if 'Note' in data:
                logger.warning(f"Alpha Vantage rate limit: {data['Note']}")
                return None
            
            time_series = data.get('Time Series (Daily)', {})
            if not time_series:
                logger.warning(f"No time series data for {symbol}")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame.from_dict(time_series, orient='index')
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            
            # Get close prices
            close_prices = pd.to_numeric(df['4. close'], errors='coerce').dropna()
            
            # Filter to requested period
            if period == "5y":
                close_prices = close_prices.tail(1260)  # ~5 years of trading days
            
            logger.info(f"Fetched {len(close_prices)} days of data for {symbol} from Alpha Vantage")
            return close_prices
            
        except Exception as e:
            logger.error(f"Alpha Vantage error for {symbol}: {str(e)}")
            return None
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price from Alpha Vantage"""
        if not self.api_key:
            return None
        
        try:
            clean_symbol = symbol.replace('.NS', '')
            params = {
                'function': 'GLOBAL_QUOTE',
                'symbol': clean_symbol,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            quote = data.get('Global Quote', {})
            price = quote.get('05. price')
            return float(price) if price else None
            
        except Exception as e:
            logger.error(f"Error getting current price for {symbol}: {str(e)}")
            return None

class TiingoProvider(DataProvider):
    """Tiingo data provider"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.api_key = api_key or os.getenv('TIINGO_API_KEY')
        self.base_url = "https://api.tiingo.com/tiingo"
        self.rate_limit_delay = 0.5  # Tiingo allows more requests
    
    def fetch_data(self, symbol: str, period: str = "5y") -> Optional[pd.Series]:
        """Fetch historical data from Tiingo"""
        if not self.api_key:
            logger.warning("Tiingo API key not provided")
            return None
        
        try:
            # Tiingo uses different symbol format
            clean_symbol = symbol.replace('.NS', '')
            
            # Calculate start date
            if period == "5y":
                start_date = (pd.Timestamp.now() - pd.Timedelta(days=1825)).strftime('%Y-%m-%d')
            else:
                start_date = (pd.Timestamp.now() - pd.Timedelta(days=365)).strftime('%Y-%m-%d')
            
            url = f"{self.base_url}/daily/{clean_symbol}/prices"
            params = {
                'startDate': start_date,
                'token': self.api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                logger.warning(f"No data returned for {symbol}")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date').sort_index()
            
            close_prices = pd.to_numeric(df['close'], errors='coerce').dropna()
            
            logger.info(f"Fetched {len(close_prices)} days of data for {symbol} from Tiingo")
            return close_prices
            
        except Exception as e:
            logger.error(f"Tiingo error for {symbol}: {str(e)}")
            return None
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price from Tiingo"""
        if not self.api_key:
            return None
        
        try:
            clean_symbol = symbol.replace('.NS', '')
            url = f"{self.base_url}/daily/{clean_symbol}/prices"
            params = {
                'token': self.api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data:
                return float(data[0]['close'])
            return None
            
        except Exception as e:
            logger.error(f"Error getting current price for {symbol}: {str(e)}")
            return None

class MultiProviderDataFetcher:
    """Main data fetcher that tries multiple providers"""
    
    def __init__(self):
        self.providers = []
        
        # Add Yahoo Finance (always available if yfinance is installed)
        try:
            self.providers.append(YahooFinanceProvider())
            logger.info("Yahoo Finance provider initialized")
        except Exception as e:
            logger.warning(f"Yahoo Finance not available: {e}")
        
        # Add Alpha Vantage if API key is available
        if os.getenv('ALPHA_VANTAGE_API_KEY'):
            try:
                self.providers.append(AlphaVantageProvider())
                logger.info("Alpha Vantage provider initialized")
            except Exception as e:
                logger.warning(f"Alpha Vantage not available: {e}")
        
        # Add Tiingo if API key is available
        if os.getenv('TIINGO_API_KEY'):
            try:
                self.providers.append(TiingoProvider())
                logger.info("Tiingo provider initialized")
            except Exception as e:
                logger.warning(f"Tiingo not available: {e}")
        
        if not self.providers:
            raise RuntimeError("No data providers available. Install yfinance or provide API keys.")
    
    def fetch_data(self, symbol: str, period: str = "5y") -> Optional[pd.Series]:
        """Try to fetch data from available providers"""
        for provider in self.providers:
            try:
                data = provider.fetch_data(symbol, period)
                if data is not None and not data.empty:
                    logger.info(f"Successfully fetched data for {symbol} using {provider.__class__.__name__}")
                    return data
            except Exception as e:
                logger.warning(f"Provider {provider.__class__.__name__} failed for {symbol}: {e}")
                continue
        
        logger.error(f"All providers failed for {symbol}")
        return None
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Try to get current price from available providers"""
        for provider in self.providers:
            try:
                price = provider.get_current_price(symbol)
                if price is not None:
                    logger.info(f"Successfully got current price for {symbol} using {provider.__class__.__name__}")
                    return price
            except Exception as e:
                logger.warning(f"Provider {provider.__class__.__name__} failed for {symbol}: {e}")
                continue
        
        logger.error(f"All providers failed to get current price for {symbol}")
        return None

# Global instance
data_fetcher = MultiProviderDataFetcher()

# Convenience functions
def fetch_close_series(symbol: str, years: int = 5) -> pd.Series:
    """Fetch daily close prices for a symbol from any available provider"""
    period = f"{years}y"
    data = data_fetcher.fetch_data(symbol, period)
    if data is None:
        raise ValueError(f"No price data returned for {symbol}")
    return data

def get_current_price(symbol: str) -> float:
    """Get current price for a symbol from any available provider"""
    price = data_fetcher.get_current_price(symbol)
    if price is None:
        raise ValueError(f"No current price available for {symbol}")
    return price
