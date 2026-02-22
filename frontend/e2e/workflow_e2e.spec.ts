import { test, expect } from '@playwright/test';

test.describe('Workflow Full E2E Integration', () => {
    test('Create Project, Workflow, and verify Editor loads', async ({ page }) => {
        // Increased timeout since it might take time for the backend to start up
        test.setTimeout(60000);

        await page.goto('/');

        // Go to workflows tab (assuming the main nav has a workflows button)
        const workflowTab = page.locator('button').filter({ hasText: /Workflows|工作流/ });
        if (await workflowTab.isVisible()) {
            await workflowTab.click();
        }

        // Wait for UI to settle
        await page.waitForTimeout(1000);

        // Click New Project
        const newProjectBtn = page.locator('button', { hasText: 'New Project' }).first();
        if (await newProjectBtn.isVisible()) {
            await newProjectBtn.click();
            await page.fill('input[placeholder*="Shopping App"]', `E2E Test Project ${Date.now()}`);
            await page.locator('dialog.modal-open button.btn-primary', { hasText: 'Create Project' }).click();
            await page.waitForTimeout(1000); // Wait for API
        }

        // Click New Workflow
        const newWfBtn = page.locator('button', { hasText: 'New Workflow' }).first();
        // Hover over the first project to reveal the New Workflow button if hidden
        if (await page.locator('.group').first().isVisible()) {
            await page.locator('.group').first().hover();
        }
        await newWfBtn.click({ force: true });

        await page.fill('input[placeholder*="Login Flow"]', `E2E Flow ${Date.now()}`);
        await page.locator('dialog.modal-open button.btn-primary', { hasText: 'Create Workflow' }).click();

        // Workflow Editor should open (Check for "Save" or the workflow name)
        await expect(page.locator('button').filter({ hasText: 'Save' }).first()).toBeVisible({ timeout: 10000 });

        // Save
        const saveBtn = page.locator('button').filter({ hasText: 'Save' }).first();
        await saveBtn.click();
        await expect(page.locator('text="Workflow saved"').first()).toBeVisible({ timeout: 5000 });

        // Execute (Run Workflow Button)
        const executeBtn = page.locator('button[title="Run Workflow"]').first();
        if (await executeBtn.isVisible()) {
            await executeBtn.click();
            // Wait for started notification
            await expect(page.locator('text="Workflow started"').first()).toBeVisible({ timeout: 5000 });
        } else {
            // Check for string 'Execute' or 'Run'
            const textRunBtn = page.locator('button').filter({ hasText: /Execute|Run/ }).first();
            if (await textRunBtn.isVisible()) {
                await textRunBtn.click();
                await expect(page.locator('text="Workflow started"').first()).toBeVisible({ timeout: 5000 });
            }
        }
    });
});
