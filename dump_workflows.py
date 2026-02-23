import sqlite3
import json

db = sqlite3.connect('workflows.db')
cursor = db.cursor()
cursor.execute("SELECT id, name FROM workflows WHERE name LIKE '%loop%' OR name LIKE '%sd loop%'")
workflows = cursor.fetchall()
for wf in workflows:
    wf_id, name = wf
    print(f"Workflow: {name} (ID: {wf_id})")
    
    cursor.execute("SELECT id, name, type FROM nodes WHERE workflow_id = ?", (wf_id,))
    nodes = cursor.fetchall()
    print("Nodes:")
    for n in nodes:
        n_id, n_name, n_type = n
        print(f"  - [{n_type}] {n_name} ({n_id})")
    
    cursor.execute("SELECT id, from_node_id, to_node_id, signal FROM edges WHERE workflow_id = ?", (wf_id,))
    edges = cursor.fetchall()
    print("Edges:")
    for e in edges:
        e_id, f_n, t_n, sig = e
        print(f"  {f_n} -> {t_n} [signal: {sig}]")
db.close()
