import os
import hashlib
import pymysql

# 1. Parse DB config from backend/.env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
db_config = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "url_defender"
}

if os.path.exists(env_path):
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

def normalize_url(u):
    u = u.strip().lower()
    if u.startswith("http://"):
        u = u[7:]
    elif u.startswith("https://"):
        u = u[8:]
    if u.endswith("/"):
        u = u[:-1]
    return u

print("--- Multi-Layer Detection Pipeline Verification Script ---")

try:
    conn = pymysql.connect(
        host=db_config["host"],
        port=db_config["port"],
        user=db_config["user"],
        password=db_config["password"],
        database=db_config["database"]
    )
    print("[OK] MySQL connection successful!")
except Exception as e:
    print(f"[ERROR] MySQL connection failed: {e}")
    sys.exit(1)

try:
    with conn.cursor() as cursor:
        # Check if kaggle table exists and is populated
        cursor.execute("SELECT COUNT(*) FROM kaggle_url_reputation")
        count = cursor.fetchone()[0]
        print(f"[OK] Table 'kaggle_url_reputation' exists. Total rows populated: {count}")
        
        # Test 1: URL Normalization and MD5 Exact Match
        test_url = "http://br-icloud.com.br"
        normalized = normalize_url(test_url)
        url_hash = hashlib.md5(normalized.encode('utf-8')).hexdigest()
        
        cursor.execute(
            "SELECT normalized_url, category, source, confidence FROM kaggle_url_reputation WHERE url_hash = %s LIMIT 1",
            (url_hash,)
        )
        row = cursor.fetchone()
        if row:
            print(f"[OK] Exact Match Verification for test URL '{test_url}':")
            print(f"  - Normalized URL: {row[0]}")
            print(f"  - Category: {row[1]}")
            print(f"  - Source: {row[2]}")
            print(f"  - Confidence: {row[3]}")
        else:
            print(f"[ERROR] Test URL '{test_url}' not found in the index.")
            
        # Test 2: Check standard local cache table
        cursor.execute("SHOW TABLES LIKE 'url_analyses'")
        row = cursor.fetchone()
        if row:
            print("[OK] Table 'url_analyses' (Layer 1 Cache) exists.")
        else:
            print("[ERROR] Table 'url_analyses' missing.")

finally:
    conn.close()
