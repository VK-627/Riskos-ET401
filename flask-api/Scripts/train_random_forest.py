from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import os

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / 'Scripts'
OUT_DIR = Path(__file__).resolve().parents[1] / 'persisted_models'
OUT_DIR.mkdir(parents=True, exist_ok=True)

def prepare_features(series, lags=5):
    # create lag features (last lags returns)
    returns = series.pct_change().dropna()
    X = []
    y = []
    for i in range(lags, len(returns)):
        X.append(returns.iloc[i-lags:i].values[::-1])
        y.append(returns.iloc[i])
    return np.array(X), np.array(y)

def train_for_file(csv_path):
    df = pd.read_csv(csv_path, index_col=0, parse_dates=True)
    # coerce numeric
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    numeric_cols = df.select_dtypes(include=[float, int]).columns.tolist()
    if not numeric_cols:
        return None
    price_col = 'Close' if 'Close' in df.columns else numeric_cols[-1]
    series = df[price_col].dropna()
    X, y = prepare_features(series, lags=5)
    if len(y) < 50:
        return None
    rf = RandomForestRegressor(n_estimators=100, n_jobs=-1)
    rf.fit(X, y)
    return rf

def main():
    files = sorted(SCRIPTS_DIR.glob('*.csv'))
    for f in files:
        try:
            model = train_for_file(f)
            if model is None:
                print(f"Skipping {f.name}: insufficient data or no numeric column")
                continue
            # save per-symbol model
            sym = f.name.split('_')[0]
            out_path = OUT_DIR / f"{sym}_rf.pkl"
            joblib.dump(model, out_path)
            print(f"Saved model for {sym} -> {out_path}")
        except Exception as e:
            print(f"Error training for {f.name}: {e}")

if __name__ == '__main__':
    main()
