import sys
import os
import time
from playwright.sync_api import sync_playwright

def run():
    print("Starting Playwright simulation...")
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception as e:
            print(f"Failed to launch browser: {e}")
            return

        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to http://localhost:5173/workflow")
        try:
            page.goto("http://localhost:5173/workflow", timeout=60000)
            # Wait for dashboard to load
            page.wait_for_selector('h1:has-text("Workflows")', timeout=60000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            # Try to capture screenshot of error state
            try:
                page.screenshot(path="doc/workflow_ux/screenshots/error_loading.png")
            except:
                pass
            browser.close()
            return

        timestamp = int(time.time())
        project_name = f"UX Test Project {timestamp}"
        workflow_name = f"Script Equivalence Test {timestamp}"

        print(f"Creating Project: {project_name}...")
        try:
            # Click "New Project"
            page.click('button:has-text("New Project")')
            # Fill project name
            page.fill('input[placeholder="e.g. Shopping App"]', project_name)
            # Click Create
            page.click('button:has-text("Create Project")')
            # Wait for project card
            page.wait_for_selector(f'h3:has-text("{project_name}")')
        except Exception as e:
            print(f"Error creating project: {e}")
            page.screenshot(path="doc/workflow_ux/screenshots/error_project.png")
            browser.close()
            return

        print(f"Creating Workflow: {workflow_name}...")
        try:
            # Click "Empty (click to create)" inside the project card
            # Using specific locator to avoid ambiguity if multiple projects
            page.locator(f'.card:has-text("{project_name}")').locator('span:has-text("Empty (click to create)")').click()

            # Fill workflow name
            page.fill('input[placeholder="e.g. Login Flow"]', workflow_name)
            # Click Create
            page.click('button:has-text("Create Workflow")')

            # Wait for editor to load (Canvas)
            page.wait_for_selector('.react-flow', timeout=30000)
            print("Editor Loaded")
        except Exception as e:
            print(f"Error creating workflow: {e}")
            page.screenshot(path="doc/workflow_ux/screenshots/error_workflow.png")
            browser.close()
            return

        # Helper to add node via Quick Add (Sidebar)
        def add_node(node_name):
            print(f"Adding Node: {node_name}")
            try:
                # Check if center button exists
                if page.is_visible('button:has-text("Add first step...")'):
                     page.click('button:has-text("Add first step...")')
                else:
                     page.click('button[data-tip="Add node"]')

                # Wait for sidebar
                page.wait_for_selector('input[placeholder="Search nodes..."]')

                # Click the node type
                # The button contains the label text.
                # Use exact match or strong partial match to avoid matching description
                page.click(f'button:has-text("{node_name}")')

                # Wait for node to appear on canvas
                # We wait a bit to ensure animation is done
                page.wait_for_timeout(1000)
            except Exception as e:
                print(f"Error adding node {node_name}: {e}")
                page.screenshot(path=f"doc/workflow_ux/screenshots/error_add_{node_name.replace(' ', '_')}.png")

        # Step 1: Add Find Image
        add_node("Find Image")
        time.sleep(1)
        page.screenshot(path="doc/workflow_ux/screenshots/step1_add_find_image.png")

        # Debug: Check for modal
        if page.is_visible('.fixed.z-\\[200\\]'):
            print("Modal detected! Taking screenshot...")
            page.screenshot(path="doc/workflow_ux/screenshots/debug_modal.png")
            # Try to close it
            try:
                page.click('button.btn-circle:has(svg.lucide-x)', timeout=2000)
            except:
                print("Could not close modal via button, trying escape")
                page.keyboard.press('Escape')
            time.sleep(1)

        # Step 2: Add If Condition
        add_node("If Condition")

        print("Configuring If Condition...")
        try:
            # Double click "If Condition" node.
            if_node = page.locator('.react-flow__node:has-text("If Condition")').last
            if_node.dblclick()

            # Wait for modal
            page.wait_for_selector('div:has-text("Parameters")')

            # Configure Value 1
            # "Value 1" is the label. We need the textarea associated with it.
            # Assuming it's the first textarea in the modal for now.
            page.fill('textarea', '{{ $node["Find Image"].json.found }}')

            # Set Operator to "boolean:isTrue"
            page.select_option('select', 'boolean:isTrue')

            time.sleep(1)
            page.screenshot(path="doc/workflow_ux/screenshots/step2_configure_if.png")

            # Close modal
            page.click('button.btn-circle:has(svg.lucide-x)') # X button uses lucide-x class usually, checking code: <X size={20} ... /> renders svg with class lucide-x? No, lucide-react renders svg.
            # In WorkflowEditorView it uses X from lucide-react. The SVG usually has class `lucide lucide-x`.
            # Or just use the button class.
            page.click('button.btn-circle.btn-ghost')
        except Exception as e:
            print(f"Error configuring If Condition: {e}")
            page.screenshot(path="doc/workflow_ux/screenshots/error_config_if.png")

        # Step 3: Add Click
        add_node("Click")
        print("Configuring Click...")
        try:
            click_node = page.locator('.react-flow__node:has-text("Click")').last
            click_node.dblclick()
            page.wait_for_selector('div:has-text("Parameters")')

            # Toggle expression for X and Y
            # Locate all toggle buttons
            toggles = page.locator('.tooltip[data-tip="Switch to Expression"] button')
            if toggles.count() >= 2:
                toggles.nth(0).click()
                toggles.nth(1).click()

                # Now inputs are textareas
                # We have 2 textareas now.
                page.fill('textarea >> nth=0', '{{ $node["Find Image"].json.x }}')
                page.fill('textarea >> nth=1', '{{ $node["Find Image"].json.y }}')
            else:
                print("Could not find toggles for Click node")

            time.sleep(1)
            page.screenshot(path="doc/workflow_ux/screenshots/step3_configure_click.png")
            page.click('button.btn-circle.btn-ghost')
        except Exception as e:
            print(f"Error configuring Click: {e}")
            page.screenshot(path="doc/workflow_ux/screenshots/error_config_click.png")

        # Step 4: Add Else Path (Find Image B)
        add_node("Find Image")
        print("Renaming Find Image...")
        try:
            # Double click
            page.locator('.react-flow__node:has-text("Find Image")').last.dblclick()
            page.wait_for_selector('div:has-text("Parameters")')
            # Click title to rename
            page.click('span.text-lg.font-bold')
            page.fill('input.text-lg', 'Find Image B')
            page.press('input.text-lg', 'Enter')
            time.sleep(0.5)
            page.screenshot(path="doc/workflow_ux/screenshots/step4_add_else_path.png")
            page.click('button.btn-circle.btn-ghost')
        except Exception as e:
             print(f"Error renaming node: {e}")
             page.screenshot(path="doc/workflow_ux/screenshots/error_rename.png")

        # Step 5: Final Workflow
        add_node("If Condition")
        add_node("Log")

        time.sleep(1)
        page.screenshot(path="doc/workflow_ux/screenshots/step5_final_workflow.png")

        browser.close()
        print("Simulation complete.")

if __name__ == "__main__":
    run()
