import os
import sys
import hashlib
import kagglehub
import pandas as pd
import pymysql

# 1. Parse backend/.env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
db_config = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "url_defender"
}

if os.path.exists(env_path):
    print(f"Reading configuration from {env_path}...")
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key == "DB_HOST":
                    db_config["host"] = val
                elif key == "DB_PORT":
                    db_config["port"] = int(val)
                elif key == "DB_USER":
                    db_config["user"] = val
                elif key == "DB_PASSWORD":
                    db_config["password"] = val
                elif key == "DB_NAME":
                    db_config["database"] = val
else:
    print(f"Warning: {env_path} not found, using default DB credentials.")

# 2. Download Kaggle dataset
print("Downloading Kaggle dataset sid321axn/malicious-urls-dataset...")
dataset_dir = kagglehub.dataset_download("sid321axn/malicious-urls-dataset")
csv_path = os.path.join(dataset_dir, "malicious_phish.csv")
if not os.path.exists(csv_path):
    print(f"Error: {csv_path} not found.")
    sys.exit(1)

# 3. Load dataset in Pandas
print("Loading and profiling dataset...")
df = pd.read_csv(csv_path)
total_raw = len(df)
print(f"Loaded {total_raw} rows successfully.")

# 4. Normalize URLs
print("Normalizing URLs...")
def normalize_url(u):
    if not isinstance(u, str):
        return ""
    u = u.strip().lower()
    # Strip http:// or https://
    if u.startswith("http://"):
        u = u[7:]
    elif u.startswith("https://"):
        u = u[8:]
    # Strip trailing slash
    if u.endswith("/"):
        u = u[:-1]
    return u

df['normalized'] = df['url'].apply(normalize_url)
df = df[df['normalized'] != ""]

# 5. Deduplicate based on threat priority (Malware > Phishing > Defacement > Benign)
print("Deduplicating threat entries...")
priority_map = {
    "malware": 4,
    "phishing": 3,
    "defacement": 2,
    "benign": 1
}
df['priority'] = df['type'].map(priority_map).fillna(1)
df = df.sort_values(by=['normalized', 'priority'], ascending=[True, False])
df = df.drop_duplicates(subset=['normalized'], keep='first')

print(f"Unique URLs after normalization & deduplication: {len(df)}")

# 6. Compute MD5 hashes
print("Computing MD5 hashes...")
df['url_hash'] = df['normalized'].apply(lambda x: hashlib.md5(x.encode('utf-8')).hexdigest())

# 7. Connect to MySQL and setup table
print(f"Connecting to MySQL database {db_config['database']} at {db_config['host']}...")
conn = pymysql.connect(
    host=db_config["host"],
    port=db_config["port"],
    user=db_config["user"],
    password=db_config["password"],
    database=db_config["database"]
)

try:
    with conn.cursor() as cursor:
        print("Recreating table kaggle_url_reputation...")
        cursor.execute("DROP TABLE IF EXISTS kaggle_url_reputation")
        cursor.execute("""
            CREATE TABLE kaggle_url_reputation (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                normalized_url VARCHAR(1000) NOT NULL,
                url_hash VARCHAR(32) NOT NULL,
                category VARCHAR(50) NOT NULL,
                source VARCHAR(50) NOT NULL DEFAULT 'Kaggle Dataset',
                confidence VARCHAR(50) NOT NULL DEFAULT 'Medium',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_url_hash (url_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()

        # 8. Bulk Insert
        print("Inserting records in chunks...")
        records = df[['normalized', 'url_hash', 'type']].values.tolist()
        chunk_size = 10000
        total_inserted = 0
        
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            cursor.executemany(
                "INSERT INTO kaggle_url_reputation (normalized_url, url_hash, category) VALUES (%s, %s, %s)",
                chunk
            )
            conn.commit()
            total_inserted += len(chunk)
            print(f"Inserted {total_inserted}/{len(records)} records...")
            
    print("Database build completed successfully!")

finally:
    conn.close()
