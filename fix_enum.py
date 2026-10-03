import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()
try:
    cur.execute("ALTER TYPE role ADD VALUE 'researcher';")
    conn.commit()
    print("Added 'researcher' to role enum")
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
