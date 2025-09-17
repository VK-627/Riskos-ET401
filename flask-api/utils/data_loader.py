import os
import pandas as pd

def get_csv_file_mapping(folder_path):
    mapping = {}
    for filename in os.listdir(folder_path):
        if filename.endswith('.csv'):
            full_path = os.path.join(folder_path, filename)
            stock_name = filename.split('_')[0].replace('.NS', '').lower()  # 'hdfcbank'
            full_stock_name = filename.split('_')[0]  # 'HDFCBANK.NS'
            mapping[stock_name] = {
                "file_path": full_path,
                "full_name": full_stock_name
            }
    return mapping

def load_stock_data(folder_path):
    all_data = {}
    for filename in os.listdir(folder_path):
        if filename.endswith('.csv'):
            full_path = os.path.join(folder_path, filename)
            stock_df = pd.read_csv(full_path)
            stock_df['Close'] = pd.to_numeric(stock_df['Close'], errors='coerce')
            stock_df.dropna(subset=['Close'], inplace=True)
            stock_name = filename.split('_')[0]  # 'HDFCBANK.NS'
            if 'Date' in stock_df.columns:
                stock_df['Date'] = pd.to_datetime(stock_df['Date'], errors='coerce')
                stock_df.set_index('Date', inplace=True)
            all_data[stock_name] = stock_df['Close']
    return pd.DataFrame(all_data)
