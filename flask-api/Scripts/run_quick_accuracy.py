from pathlib import Path
import sys
import time
import json
import numpy as np
import pandas as pd

# ensure project root is on sys.path for local imports
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils.data_loader import load_stock_data

OUTPUT_DIR = ROOT / 'portfolio_analysis_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / 'quick_forecast_results.json'


def mae(p, a):
    return float(np.mean(np.abs(p - a)))


def rmse(p, a):
    return float(np.sqrt(np.mean((p - a) ** 2)))


def mape(p, a):
    eps = 1e-8
    return float(np.mean(np.abs((a - p) / np.where(np.abs(a) < eps, eps, np.abs(a)))))


def hit_rate(p, a):
    return float(np.mean(np.sign(p) == np.sign(a)))


def simple_trend_forecast(hist):
    # Linear fit on index positions -> next-step extrapolation
    if len(hist) < 3:
        return float(hist.iloc[-1])
    y = np.asarray(hist)
    x = np.arange(len(y)).astype(float)
    # fit degree-1 polynomial
    coef = np.polyfit(x, y, 1)
    next_x = float(len(y))
    return float(np.polyval(coef, next_x))


def run_quick_test(filepath=None, price_col=None):
    # pick first csv if not provided
    scripts_dir = ROOT / 'Scripts'
    if filepath is None:
        files = sorted(scripts_dir.glob('*.csv'))
        if not files:
            raise FileNotFoundError(f'No CSV files in {scripts_dir}')
        filepath = files[0]

    df = pd.read_csv(filepath, index_col=0, parse_dates=True)

    # Try to coerce columns to numeric to handle messy CSV rows
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    # prefer explicit 'Close' column, fallback to last numeric column
    if price_col and price_col in df.columns:
        chosen_col = price_col
    elif 'Close' in df.columns:
        chosen_col = 'Close'
    else:
        numeric_cols = df.select_dtypes(include=[float, int]).columns.tolist()
        if not numeric_cols:
            raise ValueError('No numeric price columns found in CSV (after coercion)')
        chosen_col = numeric_cols[-1]

    price_series = df[chosen_col].dropna()
    returns = price_series.pct_change().dropna()

    n = len(returns)
    if n < 30:
        raise ValueError('Insufficient data for quick test')

    start_idx = int(n * 0.8)
    per_model = {}

    # Define lightweight models
    models = ['Naive(0)', 'Lag1', 'Trend']

    for m in models:
        preds = []
        acts = []
        total_time = 0.0
        for t in range(start_idx, n - 1):
            hist = returns.iloc[:t]
            actual = float(returns.iloc[t + 1])
            t0 = time.perf_counter()
            if m == 'Naive(0)':
                pred = 0.0
            elif m == 'Lag1':
                pred = float(hist.iloc[-1])
            elif m == 'Trend':
                try:
                    pred = simple_trend_forecast(hist.values)
                except Exception:
                    pred = float(hist.iloc[-1])
            else:
                pred = 0.0
            total_time += time.perf_counter() - t0
            preds.append(pred)
            acts.append(actual)

        preds = np.array(preds)
        acts = np.array(acts)
        per_model[m] = {
            'MAE': mae(preds, acts),
            'RMSE': rmse(preds, acts),
            'MAPE': mape(preds, acts),
            'HitRate': hit_rate(preds, acts),
            'Count': int(len(preds)),
            'total_seconds': float(total_time),
            'avg_seconds_per_step': float(total_time / max(1, len(preds)))
        }

    result = {
        'file': str(filepath),
        'price_col': price_col,
        'n_points': int(n),
        'start_idx': int(start_idx),
        'per_model': per_model
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    # print a short table
    print('Quick forecast results saved to', OUTPUT_FILE)
    for name, vals in per_model.items():
        print(f"{name}: MAE={vals['MAE']:.6f}, RMSE={vals['RMSE']:.6f}, Hit={vals['HitRate']:.3f}, avg_sec={vals['avg_seconds_per_step']:.6f}")

    return result


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--file', help='CSV file path', default=None)
    p.add_argument('--col', help='Price column name', default=None)
    args = p.parse_args()
    run_quick_test(filepath=args.file, price_col=args.col)
