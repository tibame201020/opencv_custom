import { test, expect } from '@playwright/test';

test.describe('Phase 1: User Journey', () => {
  test('No-Code User Workflow Creation', async ({ page }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Open App
    console.log("Step 1: Open App");
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Adjust path relative to frontend execution
    const screenshotDir = '../doc/workflow_ux/screenshots';
    await page.screenshot({ path: `${screenshotDir}/01_home.png` });

    // 2. Create Project
    console.log("Step 2: Create Project");
    // Ensure we are on Dashboard
    // Try to find "New Project" button directly
    let newProjectBtn = page.locator('button', { hasText: 'New Project' }).first();
    if (!await newProjectBtn.isVisible()) {
        // Maybe in Workflows tab
        // Use .locator('div') or generic locator because it might be a div in a sidebar
        // Or look for text "Workflow" (singular)
        const workflowTab = page.locator('div, button').filter({ hasText: /^Workflow$|^工作流$/ }).first();
        if (await workflowTab.isVisible()) {
            await workflowTab.click();
            await page.waitForTimeout(1000);
        }
    }

    newProjectBtn = page.locator('button', { hasText: 'New Project' }).first();
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    await page.fill('input[placeholder*="Shopping App"]', 'User Journey Project');
    await page.locator('dialog.modal-open button.btn-primary', { hasText: 'Create Project' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/02_project_created.png` });

    // 3. Create Workflow
    console.log("Step 3: Create Workflow");
    // Find project card and hover to see "New Workflow"
    const projectCard = page.locator('.card-body').first();
    await projectCard.hover();
    await page.locator('button', { hasText: 'New Workflow' }).first().click({ force: true });

    await page.fill('input[placeholder*="Login Flow"]', 'Button Logic Flow');
    await page.locator('dialog.modal-open button.btn-primary', { hasText: 'Create Workflow' }).click();
    await page.waitForTimeout(2000); // Wait for editor
    await page.screenshot({ path: `${screenshotDir}/03_workflow_editor.png` });

    // Helper to add node
    const addNode = async (name: string, newLabel: string) => {
        console.log(`Adding node: ${name}`);
        // Open Sidebar via toolbar button (Plus icon)
        // Find button with data-tip="Add node"
        await page.locator('button[data-tip="Add node"]').click();
        await page.waitForTimeout(500);

        // Use search
        const searchInput = page.locator('input[placeholder="Search nodes..."]');
        await searchInput.fill(name);
        await page.waitForTimeout(500);

        // Click the first button in the list (assuming it's the filtered node)
        // The sidebar items are likely buttons inside a list
        await page.locator('div.flex-1.overflow-y-auto button').first().click();

        // Wait for node to appear on canvas
        // We expect a node with the label "Find Image" (or whatever name was passed)
        // Note: The label inside the node might be "Find Image" initially
        await expect(page.locator('.react-flow__node').filter({ hasText: name })).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500);

        // Rename it to avoid confusion
        // Find the node we just added. It should be selected or we find by text.
        const targetNode = page.locator('.react-flow__node').filter({ hasText: name }).last();

        await targetNode.dblclick();
        await page.waitForTimeout(500);

        // Rename
        // Click the name to edit
        const nameDisplay = page.locator('div.group.flex.items-center.gap-2.cursor-pointer');
        if (await nameDisplay.isVisible()) {
            await nameDisplay.click();
            await page.locator('input.input-sm.font-bold').fill(newLabel);
            await page.keyboard.press('Enter');
        }
    };

    // 4. Add "Find Image" (Button A)
    await addNode('Find Image', 'Find Button A');

    // Configure "Image" param for Node A
    // Node settings modal should be open
    const imageLabel = page.locator('label').filter({ hasText: 'Image' }).first();
    // Toggle expression mode (button inside label)
    await imageLabel.locator('button').click();
    // Type path in Monaco editor
    await page.locator('.monaco-editor').first().click();
    await page.keyboard.type('assets/button_a.png');
    // Close modal
    await page.locator('button.btn-circle').first().click(); // Close button
    await page.screenshot({ path: `${screenshotDir}/04_node_a_added.png` });

    // 5. Add "If Condition"
    await addNode('If Condition', 'Check A Found');

    // Configure If Condition
    // Value 1
    const value1Label = page.locator('label').filter({ hasText: 'Value 1' }).first();
    // It is already expression.
    // Need to focus editor. It's likely the first one in the modal.
    // But we might have multiple editors.
    // Value 1 is the first param.
    await page.locator('.monaco-editor').nth(0).click();
    // Clear existing content? Monaco is tricky. Select all + delete.
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('{{ $node["Find Button A"].output.found }}');

    // Operator
    await page.locator('select').selectOption('boolean:isTrue');

    // Close modal
    await page.locator('button.btn-circle').first().click();

    // 6. Connect Find A -> If
    const nodes = page.locator('.react-flow__node');
    const nodeA = nodes.nth(0);
    const nodeIf = nodes.nth(1);

    // Drag from source handle to target handle
    const sourceHandle = nodeA.locator('.react-flow__handle-right').first(); // Find Image has multiple outputs?
    // Find Image has outputs: found, x, y. Usually it has one handle or multiple?
    // The registry says "outputs" list.
    // If multiple outputs, multiple handles? Or one handle carrying object?
    // n8n usually has one output handle unless specific logic.
    // Let's assume one handle on right.
    const targetHandle = nodeIf.locator('.react-flow__handle-left').first();

    await sourceHandle.dragTo(targetHandle, { force: true });
    await page.screenshot({ path: `${screenshotDir}/05_connected.png` });

    // 7. Add "Click" (Button A - True path)
    await addNode('Click', 'Click A');
    // Connect If (True) -> Click A
    // If node has 'true' and 'false' handles?
    // Registry says: handleConfig: { sources: [{ id: 'true' }, { id: 'false' }] }
    // So it should have two handles on right.
    // We need to find the 'true' handle.
    // Usually handles have tooltips or specific classes/order.
    // 'true' is likely top one.
    const ifHandles = nodeIf.locator('.react-flow__handle-right');
    // Assume first is true.
    const trueHandle = ifHandles.nth(0);
    const clickA = nodes.nth(2);
    const clickATarget = clickA.locator('.react-flow__handle-left').first();

    await trueHandle.dragTo(clickATarget, { force: true });

    // 8. Add "Find Image" (Button B - False path)
    await addNode('Find Image', 'Find Button B');
    const findB = nodes.nth(3);

    // Config B
    const imageLabelB = page.locator('label').filter({ hasText: 'Image' }).first();
    await imageLabelB.locator('button').click();
    await page.locator('.monaco-editor').first().click();
    await page.keyboard.type('assets/button_b.png');
    await page.locator('button.btn-circle').first().click();

    // Connect If (False) -> Find B
    const falseHandle = ifHandles.nth(1);
    const findBTarget = findB.locator('.react-flow__handle-left').first();
    await falseHandle.dragTo(findBTarget, { force: true });

    await page.screenshot({ path: `${screenshotDir}/06_full_graph.png` });

    // 9. Execute
    // Click "Execute Workflow" button (Play icon)
    // It contains text "Execute Workflow"
    await page.locator('button', { hasText: 'Execute Workflow' }).click();

    // Wait for execution to finish (or timeout)
    // Look for status logs or indicators.
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/07_execution.png` });

    // Check logs?
    // Open Inspector?
    // Inspector opens automatically.
  });
});
