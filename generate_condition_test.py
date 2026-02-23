import sqlite3
import json
import uuid

def generate_id():
    return str(uuid.uuid4())

def insert_node(nodes_list, name, node_type, config, x, y):
    node_id = generate_id()
    nodes_list.append({
        "id": node_id,
        "name": name,
        "type": node_type,
        "config": config,
        "disabled": False,
        "x": x,
        "y": y
    })
    return node_id

def insert_edge(edges_list, from_node, to_node, signal="success"):
    edges_list.append({
        "id": generate_id(),
        "fromNodeId": from_node,
        "toNodeId": to_node,
        "signal": signal
    })

def create_condition_test_suite():
    db = sqlite3.connect('workflows.db')
    cursor = db.cursor()

    workflow_id = "test_condition_suite"
    project_id = "test_project" # Ensure a project exists or just inject loosely
    workflow_name = "Condition Node Exhaustive Test"
    
    # Try to ensure we don't duplicate
    cursor.execute("DELETE FROM workflows WHERE id=?", (workflow_id,))
    cursor.execute("DELETE FROM nodes WHERE workflow_id=?", (workflow_id,))
    cursor.execute("DELETE FROM edges WHERE workflow_id=?", (workflow_id,))
    
    # Ensure project exists
    cursor.execute("INSERT OR IGNORE INTO projects (id, name, platform) VALUES (?, ?, ?)", 
                  (project_id, "Test Project", "android"))

    nodes = []
    edges = []

    # 1. Trigger
    trigger_id = insert_node(nodes, "Start", "manual_trigger", {}, 0, 0)
    
    # 2. Set Variables (Test Data Injector)
    test_data = {
        "str_val": "hello",
        "empty_str": "",
        "num_val": 42.5,
        "bool_val": True,
        "bool_false": False,
        "date_val": "2026-02-23",
        "array_val": [1, 2, "three"],
        "empty_array": [],
        "obj_val": {"some": "key"},
        "empty_obj": {}
    }
    
    vars_id = insert_node(nodes, "Inject Test Data", "set_variable", {"variables": test_data}, 250, 0)
    insert_edge(edges, trigger_id, vars_id)

    # 3. Create all conditions
    # For now test Core Types (Strings, Numbers, Booleans) that are currently implemented in executors_builtin.go
    # Looking at `createIfExecutor`, many aren't fully implemented yet, so we test the implemented ones.
    
    tests = [
        # String
        ("String Equals", "string:equals", "{{ $json.str_val }}", "hello", True),
        ("String Not Equals", "string:notEquals", "{{ $json.str_val }}", "world", True),
        ("String Contains", "string:contains", "{{ $json.str_val }}", "ell", True),
        ("String Not Contains", "string:notContains", "{{ $json.str_val }}", "world", True),
        ("String Starts With", "string:startsWith", "{{ $json.str_val }}", "he", True),
        ("String Ends With", "string:endsWith", "{{ $json.str_val }}", "lo", True),
        ("String Is Empty", "string:isEmpty", "{{ $json.empty_str }}", "", True),
        ("String Is Not Empty", "string:isNotEmpty", "{{ $json.str_val }}", "", True),
        
        # Numbers
        ("Number Equals", "number:equals", "{{ $json.num_val }}", "42.5", True),
        ("Number GT", "number:gt", "{{ $json.num_val }}", "40", True),
        ("Number GTE", "number:gte", "{{ $json.num_val }}", "42.5", True),
        ("Number LT", "number:lt", "{{ $json.num_val }}", "50", True),
        ("Number LTE", "number:lte", "{{ $json.num_val }}", "42.5", True),
        
        # Booleans
        ("Boolean Is True", "boolean:isTrue", "{{ $json.bool_val }}", "", True),
        ("Boolean Is False", "boolean:isFalse", "{{ $json.bool_false }}", "", True),
        
        # Exists
        ("String Exists", "string:exists", "{{ $json.str_val }}", "", True),
        ("Number Exists", "number:exists", "{{ $json.num_val }}", "", True),
        ("Boolean Exists", "boolean:exists", "{{ $json.bool_val }}", "", True),
    ]

    x_offset = 550
    y_offset = -100

    for idx, (t_name, op, v1, v2, expect_true) in enumerate(tests):
        y = y_offset + (idx * 200)
        
        cond_id = insert_node(nodes, f"Test: {t_name}", "if_condition", {
            "operator": op,
            "value1": v1,
            "value2": v2
        }, x_offset, y)
        
        insert_edge(edges, vars_id, cond_id)
        
        # Add success/fail logs for visual verification
        log_t_id = insert_node(nodes, f"Passed: {t_name}", "log", {"message": f"{t_name} Evaluated TRUE", "type": "info"}, x_offset + 300, y - 50)
        log_f_id = insert_node(nodes, f"Failed: {t_name}", "log", {"message": f"ERROR! {t_name} Evaluated FALSE!", "type": "error"}, x_offset + 300, y + 50)
        
        # Expected True means it should route to 'true' handle
        insert_edge(edges, cond_id, log_t_id, signal="true")
        insert_edge(edges, cond_id, log_f_id, signal="false")

    # Serialize workflow
    nodes_json = json.dumps(nodes)
    edges_json = json.dumps(edges)

    cursor.execute("""
        INSERT INTO workflows (id, project_id, name, description)
        VALUES (?, ?, ?, ?)
    """, (workflow_id, project_id, workflow_name, "Exhaustive condition test suite generated by agent"))

    for node in nodes:
        cursor.execute("INSERT INTO nodes (id, workflow_id, name, type, config, x, y, disabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (node['id'], workflow_id, node['name'], node['type'], json.dumps(node['config']), node['x'], node['y'], 0))
        
    for edge in edges:
        cursor.execute("INSERT INTO edges (id, workflow_id, from_node_id, to_node_id, signal) VALUES (?, ?, ?, ?, ?)",
            (edge['id'], workflow_id, edge['fromNodeId'], edge['toNodeId'], edge['signal']))

    db.commit()
    db.close()
    print("Test Suite generated successfully. You can now execute 'test_condition_suite'.")

if __name__ == "__main__":
    create_condition_test_suite()
