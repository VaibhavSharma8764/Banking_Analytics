from database import engine

def load(df):
    df.to_sql("transactions", engine, if_exists="append", index=False)