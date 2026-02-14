
import os
import time
from playwright.sync_api import sync_playwright

def verify_n8n_style(page):
    # Mock API responses
    # Projects mock
    page.route("**/projects", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[{"id": "p1", "name": "Test Project", "workflows": [{"id": "w1", "name": "My Workflow", "projectId": "p1"}]}]'
    ))

    # Single workflow mock
    page.route("**/workflows/w1", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": "w1", "name": "My Workflow", "nodes": {"n1": {"id": "n1", "type": "click", "name": "Start", "x": 100, "y": 100}, "n2": {"id": "n2", "type": "click", "name": "End", "x": 400, "y": 100}}, "edges": [{"id": "e1", "fromNodeId": "n1", "toNodeId": "n2"}]}'
    ))

    # Run mock
    page.route("**/workflows/w1/run", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"runId": "run-123"}'
    ))

    # Go to the workflow page directly
    print("Navigating to /workflow...")
    page.goto("http://localhost:5173/workflow")

    # Wait for projects to load (Folders)
    print("Waiting for projects...")
    # Based on WorkflowEditorView, project name is h3
    page.wait_for_selector("text=Test Project", timeout=10000)

    # Click on the workflow to open editor
    print("Opening workflow...")
    page.click("text=My Workflow")

    # Wait for editor to load (canvas)
    print("Waiting for editor...")
    page.wait_for_selector(".react-flow__pane", timeout=10000)
    time.sleep(2) # wait for animation

    # Take screenshot of Editor (check Zoom controls at bottom left)
    print("Taking screenshot of Editor...")
    os.makedirs("verification", exist_ok=True)
    page.screenshot(path="verification/editor_view.png")

    # Click "Execute" button (Look for Play icon or text)
    print("Clicking Execute...")
    # The button text is "Execute" when not running
    page.click("button:has-text('Execute')")

    # Wait for panel to open
    print("Waiting for Execution Inspector...")
    try:
        page.wait_for_selector("text=Execution Inspector", timeout=5000)
        time.sleep(1) # wait for animation
    except:
        print("Panel did not open or text not found.")

    # Take screenshot of Panel
    print("Taking screenshot of Panel...")
    page.screenshot(path="verification/execution_panel.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    # Set viewport to resemble a desktop
    page.set_viewport_size({"width": 1280, "height": 800})
    try:
        verify_n8n_style(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()
