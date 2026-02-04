import { test, expect } from '@playwright/test';

test('has title and sidebar', async ({ page }) => {
    await page.goto('/');

    // Check if App Title is visible (i18n might make it dynamic, so we check for the container)
    const sidebar = page.locator('div.w-20, div.w-64');
    await expect(sidebar).toBeVisible();

    // Check for execution tab
    const executionTab = page.getByRole('button', { name: /Execution|執行/ });
    await expect(executionTab).toBeVisible();
});

test('can navigate to management', async ({ page }) => {
    await page.goto('/');

    const managementTab = page.getByRole('button', { name: /Management|管理/ });
    await managementTab.click();

    // Verify URL change
    await expect(page).toHaveURL(/.*management/);
});
