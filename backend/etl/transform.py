import pandas as pd

def transform(df):
    df = df.dropna(subset=['amount', 'status', 'branch'])
    df = df.drop_duplicates()
    
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0).astype(float)
    df['amount'] = df['amount'].abs()
    
    if 'processing_time' in df.columns:
        df['processing_time'] = pd.to_numeric(df['processing_time'], errors='coerce').fillna(0).astype(float)
        df['processing_time'] = df['processing_time'].abs()

    if 'branch' in df.columns:
        df['branch'] = df['branch'].astype(str).str.strip().str.title()
    
    if 'status' in df.columns:
        df['status'] = df['status'].astype(str).str.strip().str.lower()
        
    def categorize_size(amt):
        if amt < 500:
            return 'Small'
        elif amt < 2000:
            return 'Medium'
        else:
            return 'Large'
            
    df['transaction_size'] = df['amount'].apply(categorize_size)
    
    return df