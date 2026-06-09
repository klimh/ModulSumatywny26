import sqlite3
import os

db_path = "rehabsense.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE exercise ADD COLUMN author_id INTEGER REFERENCES users(user_id);")
    conn.commit()
    print("Column added successfully.")
except sqlite3.OperationalError as e:
    print("Error:", e)

conn.close()
