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

def create_switch_loop_test_suite():
    db = sqlite3.connect('workflows.db')
    cursor = db.cursor()

    workflow_id = "test_switch_loop_suite"
    project_id = "test_project"
    workflow_name = "Switch and Loop Node Test Suite"
    
    cursor.execute("DELETE FROM workflows WHERE id=?", (workflow_id,))
    cursor.execute("DELETE FROM nodes WHERE workflow_id=?", (workflow_id,))
    cursor.execute("DELETE FROM edges WHERE workflow_id=?", (workflow_id,))
    
    cursor.execute("INSERT OR IGNORE INTO projects (id, name, platform) VALUES (?, ?, ?)", 
                  (project_id, "Test Project", "android"))

    nodes = []
    edges = []

    # 1. Trigger
    trigger_id = insert_node(nodes, "Start", "manual_trigger", {}, 0, 0)
    
    # 2. Set Variables
    test_data = {
        "str_val": "hello",
        "num_val": 42.5,
        "array_val": [1, 2, "three"],
        "loop_count": 3
    }
    
    vars_id = insert_node(nodes, "Inject Test Data", "set_variable", {"variables": test_data}, 250, 0)
    insert_edge(edges, trigger_id, vars_id)

    x_offset = 550
    y_offset = -100

    # --- Switch Tests ---
    
    # 1. Switch String
    sw_str_id = insert_node(nodes, "Switch String", "switch", {
        "value": "{{ $json.str_val }}",
        "mode": "string",
        "cases": ["foo", "bar", "hello"]
    }, x_offset, y_offset)
    insert_edge(edges, vars_id, sw_str_id)
    
    sw_str_pass = insert_node(nodes, "Passed: Switch String", "log", {"message": "Switch String Passed", "type": "info"}, x_offset + 300, y_offset - 30)
    sw_str_fail1 = insert_node(nodes, "Failed: Switch String (0)", "log", {"message": "ERROR! Switch String Failed (0)", "type": "error"}, x_offset + 300, y_offset + 30)
    sw_str_fail2 = insert_node(nodes, "Failed: Switch String (def)", "log", {"message": "ERROR! Switch String Failed (def)", "type": "error"}, x_offset + 300, y_offset + 90)
    
    insert_edge(edges, sw_str_id, sw_str_fail1, signal="0")
    insert_edge(edges, sw_str_id, sw_str_pass, signal="2") # index 2 is "hello"
    insert_edge(edges, sw_str_id, sw_str_fail2, signal="default")
    
    # 2. Switch Number
    sw_num_id = insert_node(nodes, "Switch Number", "switch", {
        "value": "{{ $json.num_val }}",
        "mode": "number",
        "cases": [10, 20, 42.5]
    }, x_offset, y_offset + 250)
    insert_edge(edges, vars_id, sw_num_id)
    
    sw_num_pass = insert_node(nodes, "Passed: Switch Number", "log", {"message": "Switch Number Passed", "type": "info"}, x_offset + 300, y_offset + 220)
    sw_num_fail = insert_node(nodes, "Failed: Switch Number", "log", {"message": "ERROR! Switch Number Failed", "type": "error"}, x_offset + 300, y_offset + 280)
    
    insert_edge(edges, sw_num_id, sw_num_pass, signal="2")
    insert_edge(edges, sw_num_id, sw_num_fail, signal="default")

    # 3. Switch Default
    sw_def_id = insert_node(nodes, "Switch Default", "switch", {
        "value": "{{ $json.str_val }}",
        "mode": "string",
        "cases": ["foo", "bar"]
    }, x_offset, y_offset + 500)
    insert_edge(edges, vars_id, sw_def_id)
    
    sw_def_pass = insert_node(nodes, "Passed: Switch Default", "log", {"message": "Switch Default Passed", "type": "info"}, x_offset + 300, y_offset + 470)
    sw_def_fail = insert_node(nodes, "Failed: Switch Default", "log", {"message": "ERROR! Switch Default Failed", "type": "error"}, x_offset + 300, y_offset + 530)
    
    insert_edge(edges, sw_def_id, sw_def_fail, signal="0")
    insert_edge(edges, sw_def_id, sw_def_pass, signal="default")

    # --- Loop Tests ---
    loop_offset_y = y_offset + 750

    # 1. Loop Array
    loop_arr_id = insert_node(nodes, "Loop Array", "loop", {
        "items": "{{ $json.array_val }}"
    }, x_offset, loop_offset_y)
    insert_edge(edges, vars_id, loop_arr_id)
    
    loop_arr_body = insert_node(nodes, "Loop Array Body", "log", {"message": "IN_LOOP: Array", "type": "info"}, x_offset + 300, loop_offset_y - 30)
    loop_arr_done = insert_node(nodes, "Passed: Loop Array Done", "log", {"message": "Loop Array Done", "type": "info"}, x_offset + 300, loop_offset_y + 30)
    
    insert_edge(edges, loop_arr_id, loop_arr_body, signal="body")
    insert_edge(edges, loop_arr_body, loop_arr_id, signal="success") # Back-edge to loop
    insert_edge(edges, loop_arr_id, loop_arr_done, signal="done")

    # 2. Loop Count
    loop_cnt_id = insert_node(nodes, "Loop Count", "loop", {
        "count": "{{ $json.loop_count }}"
    }, x_offset, loop_offset_y + 200)
    insert_edge(edges, vars_id, loop_cnt_id)
    
    loop_cnt_body = insert_node(nodes, "Loop Count Body", "log", {"message": "IN_LOOP: Count", "type": "info"}, x_offset + 300, loop_offset_y + 170)
    loop_cnt_done = insert_node(nodes, "Passed: Loop Count Done", "log", {"message": "Loop Count Done", "type": "info"}, x_offset + 300, loop_offset_y + 230)
    
    insert_edge(edges, loop_cnt_id, loop_cnt_body, signal="body")
    insert_edge(edges, loop_cnt_body, loop_cnt_id, signal="success") # Back-edge to loop
    insert_edge(edges, loop_cnt_id, loop_cnt_done, signal="done")

    cursor.execute("""
        INSERT INTO workflows (id, project_id, name, description)
        VALUES (?, ?, ?, ?)
    """, (workflow_id, project_id, workflow_name, "Exhaustive switch and loop test suite generated by agent"))

    for node in nodes:
        cursor.execute("INSERT INTO nodes (id, workflow_id, name, type, config, x, y, disabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (node['id'], workflow_id, node['name'], node['type'], json.dumps(node['config']), node['x'], node['y'], 0))
        
    for edge in edges:
        cursor.execute("INSERT INTO edges (id, workflow_id, from_node_id, to_node_id, signal) VALUES (?, ?, ?, ?, ?)",
            (edge['id'], workflow_id, edge['fromNodeId'], edge['toNodeId'], edge['signal']))

    db.commit()
    db.close()
    print("Test Suite generated successfully. You can now execute 'test_switch_loop_suite'.")

if __name__ == "__main__":
    create_switch_loop_test_suite()
