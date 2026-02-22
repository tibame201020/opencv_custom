import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 1: User Journey - Script Equivalence', () => {
  test('Simulate No-Code User Creating Logic Workflow', async ({ page }) => {
    test.setTimeout(180000); // 3 mins

    const screenshotDir = path.resolve(__dirname, '../../doc/workflow_ux/screenshots_new');
    console.log(`Saving screenshots to: ${screenshotDir}`);

    // Helper for screenshots
    const snap = async (name: string) => {
      await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
    };

    // 1. Open App
    console.log("Step 1: Open App");
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap('01_home');

    // 2. Create Project (Navigate to Workflow tab first)
    console.log("Navigating to Workflow tab...");
    const workflowTab = page.locator('a, button, div').filter({ hasText: /^Workflow$/ }).first();
    await workflowTab.click();
    await page.waitForTimeout(1000);
    await snap('02_workflow_tab');

    // Create Project
    console.log("Step 2: Create Project");
    const createProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
    if (await createProjectBtn.isVisible()) {
        await createProjectBtn.click();
        await page.waitForTimeout(500); // Animation
        await page.getByPlaceholder(/e\.g\. Shopping App/i).fill('UX Script Test ' + Date.now());
        // Click Create in modal
        await page.locator('dialog.modal-open').getByRole('button', { name: 'Create Project' }).click();
        await page.waitForTimeout(1000); // Wait for creation
        await snap('02b_project_created');
    }

    // 3. Create Workflow
    console.log("Step 3: Create Workflow");
    // Find the project card we just created (or the first one)
    // We need to hover the card to see "New Workflow" button (based on prior knowledge)
    // Or maybe click a "+" icon.
    // Let's try to find a card and hover it.
    const projectCard = page.locator('.card').first();
    await projectCard.hover();
    await page.waitForTimeout(500);

    // Look for "New Workflow" button or a "+" button inside the card
    // The screenshot implies a list inside. Maybe there's a button there.
    // Let's look for any button inside the card that might mean "Add Workflow"
    const addWorkflowBtn = projectCard.locator('button').filter({ hasText: /New Workflow|Add|Create/i }).first();

    if (await addWorkflowBtn.isVisible()) {
        await addWorkflowBtn.click();
    } else {
        // Maybe it's an icon button?
        // Or maybe we need to click "Empty (click to create)"?
        const emptyLink = projectCard.getByText('click to create');
        if (await emptyLink.isVisible()) {
            await emptyLink.click();
        } else {
             // Fallback: try to find any "plus" icon
             // Be careful not to click "Delete" or "Rename"
             // Usually "New Workflow" is distinct.
             // If we can't find it, we might be stuck.
             // Let's log and fail gracefully
             console.log("Could not find New Workflow button. Trying generic plus icon if available and safe.");
             // The code shows: <Plus size={14} /> New Workflow
             // It's a button with text "New Workflow" inside.
             // Maybe filter was too strict or visibility issue.
             // It has opacity-0 group-hover:opacity-100.
             // We hovered projectCard, so it should be visible.
             // Let's try forcing click if found but hidden
             if (await addWorkflowBtn.count() > 0) {
                 await addWorkflowBtn.click({ force: true });
             }
        }
    }

    // Fill Workflow Creation Modal
    await page.waitForTimeout(500);
    // Modal title: Add Workflow to ...
    // Placeholder: e.g. Login Flow
    const workflowInput = page.getByPlaceholder(/e\.g\. Login Flow/i);
    if (await workflowInput.isVisible()) {
        await workflowInput.fill('Script Equivalence Test ' + Date.now());
        await page.locator('dialog.modal-open').getByRole('button', { name: 'Create Workflow' }).click();
    }
    await page.waitForTimeout(2000);
    await snap('03_workflow_editor');

    // Helper to add node
    const addNode = async (nodeName: string, label?: string) => {
        console.log(`Adding node: ${nodeName}`);

        // Strategy 1: "Add first step" button (Empty state)
        const emptyStateBtn = page.getByText('Add first step');
        if (await emptyStateBtn.isVisible()) {
            await emptyStateBtn.click();
        } else {
            // Strategy 2: Toolbar "+" button
            // From screenshot, it's in a vertical toolbar on the right.
            // Likely a button with a plus icon.
            // Let's look for a button containing a Plus icon or specific class
            const toolbarPlus = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
            if (await toolbarPlus.isVisible()) {
                await toolbarPlus.click();
            } else {
                 // Strategy 3: Context menu on canvas
                 // We need to avoid the center button if it exists but is hidden/transparent? No.
                 // Just click top left of canvas to be safe
                 await page.locator('.react-flow__pane').click({ button: 'right', position: { x: 100, y: 100 } });
            }
        }

        // Search
        // The node palette usually opens.
        const search = page.getByPlaceholder(/Search nodes|Filter/i);
        // Wait for search to appear
        await expect(search).toBeVisible();
        await search.fill(nodeName);
        await page.waitForTimeout(500);

        // Click the node in list
        // It might be a button or list item.
        // Let's try matching text.
        await page.getByText(nodeName, { exact: false }).first().click();

        // Wait for node
        await page.waitForTimeout(1000); // Animation

        if (label) {
            // Rename logic here if needed, but for UX test, default names might be used first
            // Double click to rename?
            const node = page.locator('.react-flow__node').last();
            await node.dblclick();
            const input = page.locator('input.nodrag'); // Renaming input often has nodrag
            if (await input.isVisible()) {
                await input.fill(label);
                await page.keyboard.press('Enter');
            }
        }
    };

    // 4. Add "Find Image" (Button A)
    await addNode('Find Image');
    await snap('04_node_a_added');

    // Configure Node A
    console.log("Configuring Node A");
    const nodeA = page.locator('.react-flow__node').filter({ hasText: 'Find Image' }).last();
    await nodeA.dblclick(); // Open settings
    await page.waitForTimeout(500);
    await snap('05_node_a_settings');
    // Close settings (click X or outside)
    // Try to find the close button (X icon) inside the modal
    // The modal is likely the top-most dialog or fixed div
    const closeBtn = page.locator('div.fixed.inset-0.z-\\[200\\] button').filter({ has: page.locator('svg') }).last();
    if (await closeBtn.isVisible()) {
        await closeBtn.click();
    } else {
        await page.keyboard.press('Escape');
    }
    // Wait for modal to close
    await page.waitForTimeout(500);

    // 5. Add "If Condition"
    await addNode('If Condition');
    const nodeIf = page.locator('.react-flow__node').filter({ hasText: 'If Condition' }).last();

    // Connect A -> If
    console.log("Connecting A -> If");
    // We need handles.
    // This is hard with generic selectors. We'll try to execute JS or drag blindly.
    // For UX report, if this fails, it's a finding.
    const handleOut = nodeA.locator('.react-flow__handle-right').first(); // source
    const handleIn = nodeIf.locator('.react-flow__handle-left').first(); // target

    if (await handleOut.isVisible() && await handleIn.isVisible()) {
        await handleOut.dragTo(handleIn, { force: true });
    } else {
        console.log("Handles not found/visible");
    }
    await snap('06_connected_a_if');

    // 6. Add "Click" (True)
    await addNode('Click');
    const nodeClickA = page.locator('.react-flow__node').filter({ hasText: 'Click' }).last();

    // Connect If(True) -> Click
    // Assume True is Top Right handle
    const handleTrue = nodeIf.locator('.react-flow__handle-right').first();
    const handleClickIn = nodeClickA.locator('.react-flow__handle-left').first();
    await handleTrue.dragTo(handleClickIn, { force: true });

    // 7. Add "Find Image" (Button B - False path)
    await addNode('Find Image');
    const nodeB = page.locator('.react-flow__node').filter({ hasText: 'Find Image' }).last(); // The new one

    // Connect If(False) -> B
    // Assume False is Bottom Right handle
    const handleFalse = nodeIf.locator('.react-flow__handle-right').last(); // or nth(1)
    const handleBIn = nodeB.locator('.react-flow__handle-left').first();
    await handleFalse.dragTo(handleBIn, { force: true });

    await snap('07_full_structure_partial');

    // 8. Add If Condition for B
    await addNode('If Condition');
    const nodeIfB = page.locator('.react-flow__node').filter({ hasText: 'If Condition' }).last();
    // Connect B -> IfB
    const handleOutB = nodeB.locator('.react-flow__handle-right').first();
    const handleInIfB = nodeIfB.locator('.react-flow__handle-left').first();
    await handleOutB.dragTo(handleInIfB, { force: true });

    // 9. Add Click B (True)
    await addNode('Click');
    const nodeClickB = page.locator('.react-flow__node').filter({ hasText: 'Click' }).last();
    // Connect IfB(True) -> ClickB
    const handleTrueB = nodeIfB.locator('.react-flow__handle-right').first();
    const handleClickBIn = nodeClickB.locator('.react-flow__handle-left').first();
    await handleTrueB.dragTo(handleClickBIn, { force: true });

    // 10. Add Log (False)
    await addNode('Log');
    const nodeLog = page.locator('.react-flow__node').filter({ hasText: 'Log' }).last();
    // Connect IfB(False) -> Log
    const handleFalseB = nodeIfB.locator('.react-flow__handle-right').last();
    const handleLogIn = nodeLog.locator('.react-flow__handle-left').first();
    await handleFalseB.dragTo(handleLogIn, { force: true });

    await snap('08_final_workflow');

    // 11. Rename Node A and check reference (Simulated check)
    console.log("Attempting to rename Node A");
    await nodeA.dblclick();
    // Try to find title input in modal
    // This is specific to the implementation, guessing selector
    const titleInput = page.getByDisplayValue('Find Image').first();
    if (await titleInput.isVisible()) {
        await titleInput.fill('Find Button A');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape'); // Close
    }
    await snap('09_renamed_node');

    // Check If Condition expression
    await nodeIf.dblclick();
    await snap('10_check_reference');

  });
});
