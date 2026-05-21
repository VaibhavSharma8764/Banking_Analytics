import pandas as pd

def extract(file_path):
    try:
        df = pd.read_csv(file_path)
        df.columns = df.columns.str.strip()
        return df
    except Exception as e:
        print(f"Error extracting data from {file_path}: {e}")
        return pd.DataFrame(columns=["id", "transaction_id", "amount", "status", "transaction_date", "branch", "processing_time"])