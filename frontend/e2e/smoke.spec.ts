import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Mock scripts API
    await page.route('**/api/scripts', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { id: 'test_script', name: 'Test Script', platform: 'android' }
            ])
        });
    });

    // Mock devices API
    await page.route('**/api/devices', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(['emulator-5554'])
        });
    });
});

test('has title and sidebar', async ({ page }) => {
    await page.goto('/');

    // Check if Sidebar is visible
    const sidebar = page.locator('div.flex.h-screen');
    await expect(sidebar).toBeVisible();

    // Check for execution tab (i18n check)
    const executionTab = page.locator('button').filter({ hasText: /Execution|執行/ });
    await expect(executionTab).toBeVisible();
});

test('can navigate to management', async ({ page }) => {
    await page.goto('/');

    const managementTab = page.locator('button').filter({ hasText: /Management|管理/ });
    await managementTab.click();

    // Verify URL change
    await expect(page).toHaveURL(/.*management/);
});
