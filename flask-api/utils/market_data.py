import datetime as _dt
from functools import lru_cache

import pandas as pd

try:
    import yfinance as yf
except ImportError:  # Provide a helpful message if not installed
    yf = None


def ensure_nse_symbol(symbol: str) -> str:
    if not symbol:
        return ""
    s = str(symbol).strip().upper()
    return s if s.endswith(".NS") else f"{s}.NS"


@lru_cache(maxsize=256)
def _download_history_cached(symbol: str, period: str, interval: str) -> pd.DataFrame:
    if yf is None:
        raise RuntimeError("yfinance is not installed. Add it to requirements.txt")
    return yf.download(symbol, period=period, interval=interval, auto_adjust=False, progress=False, threads=False)


def fetch_close_series(symbol: str, years: int = 5) -> pd.Series:
    """Fetch daily close prices for a symbol from Yahoo Finance.

    Returns a pandas Series indexed by Date with the Close price.
    """
    sym = ensure_nse_symbol(symbol)
    period = f"{years}y"
    df = _download_history_cached(sym, period=period, interval="1d")
    if df is None or df.empty:
        raise ValueError(f"No price data returned for {sym}")
    # Ensure Date index and Close column
    df = df.rename(columns={"Adj Close": "AdjClose"})
    series = pd.to_numeric(df.get("Close"), errors="coerce").dropna()
    series.index = pd.to_datetime(series.index)
    return series


