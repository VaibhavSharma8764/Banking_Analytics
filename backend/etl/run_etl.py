from .extract import extract
from .transform import transform
from .load import load

def run_etl(file_path):
    data = extract(file_path)
    clean_data = transform(data)
    load(clean_data)