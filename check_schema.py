import sqlite3

db = sqlite3.connect('workflows.db')
cursor = db.cursor()
for table in ['workflows', 'edges', 'projects']:
    print(f"Table: {table}")
    cursor.execute(f"PRAGMA table_info({table})")
    cols = cursor.fetchall()
    for col in cols:
        print(col)
    print("-" * 20)
db.close()
