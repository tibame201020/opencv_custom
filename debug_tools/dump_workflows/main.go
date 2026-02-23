package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "workflows.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	
	rows, err := db.Query("SELECT id, name, nodes, edges FROM workflows WHERE name LIKE '%loop%' OR name LIKE '%sd loop%'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	hasRows := false
	for rows.Next() {
		hasRows = true
		var id, name, nodes, edges string
		if err := rows.Scan(&id, &name, &nodes, &edges); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("Workflow: %s\nNodes: %s\nEdges: %s\n\n", name, nodes, edges)
	}
	if !hasRows {
		fmt.Println("No workflows found matching query.")
	}
}
