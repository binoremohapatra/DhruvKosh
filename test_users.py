import os
import psycopg2
import hashlib
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute('SELECT email, role, is_approved FROM users;')
users = cur.fetchall()

pwd_hash = hashlib.sha256('password123'.encode()).hexdigest()

print('Found users:')
for u in users:
    print(f'Email: {u[0]} | Role: {u[1]} | Approved: {u[2]}')
    if u[0] != 'admin@ncpor.gov.in':
        cur.execute('UPDATE users SET password_hash = %s WHERE email = %s', (pwd_hash, u[0]))

conn.commit()
print('Set password to password123 for all non-admin users.')
cur.close()
conn.close()
