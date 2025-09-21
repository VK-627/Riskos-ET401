import os
import time
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Ensure project root is on sys.path for local imports
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils.data_loader import load_stock_data
from models.advanced_forecasting import AdvancedForecaster

OUTPUT_DIR = Path(__file__).resolve().parents[1] / 'portfolio_analysis_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / 'forecast_test_results.json'


def pick_first_symbol(stock_df: pd.DataFrame):
    if stock_df is None or stock_df.empty:
        raise RuntimeError('No stock data available')
    return stock_df.columns[0]


def one_step_backtest(returns: pd.Series, forecaster: AdvancedForecaster):
    """Perform a one-step walk-forward backtest over last 20% of series."""
    series = returns.dropna()
    n = len(series)
    if n < 30:
        raise ValueError('Not enough data for backtest')
    start_idx = int(n * 0.8)
    preds = []
    actuals = []
    total_time = 0.0
    for t in range(start_idx, n - 1):
        hist = series.iloc[:t]
        actual = float(series.iloc[t + 1])
        start_time = time.time()
        try:
            pred = forecaster.ensemble_forecast(hist, forecast_days=1)[0]
        except Exception:
            pred = float(forecaster.simple_trend_forecast(hist, 1)[0])
        elapsed = time.time() - start_time
        total_time += elapsed
        preds.append(pred)
        actuals.append(actual)
    preds = np.array(preds)
    actuals = np.array(actuals)
    mae = float(np.mean(np.abs(preds - actuals)))
    rmse = float(np.sqrt(np.mean((preds - actuals) ** 2)))
    avg_time = float(total_time / max(1, len(preds)))
    return {'mae': mae, 'rmse': rmse, 'avg_time_sec': avg_time, 'count': len(preds)}


def main():
    try:
        base_dir = Path(__file__).resolve().parents[1]
        scripts_dir = base_dir / 'Scripts'
        stock_df = load_stock_data(str(scripts_dir))
        symbol = pick_first_symbol(stock_df)
        print(f"Testing symbol: {symbol}")
        series = stock_df[symbol].pct_change().dropna()

        forecaster = AdvancedForecaster()

        # Run single-step backtest
        result = one_step_backtest(series, forecaster)

        # Persist results
        out = {
            'symbol': symbol,
            'result': result,
            'timestamp': pd.Timestamp.now().isoformat(),
            'models_available': forecaster.get_model_availability()
        }
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2)
        print(f"Saved results to {OUTPUT_FILE}")
    except Exception as e:
        print('Test runner error:', e)


if __name__ == '__main__':
    main()
