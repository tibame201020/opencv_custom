import { test, expect } from '@playwright/test';

test('Local UI Verification', async ({ page }) => {
  // Mock API
  await page.route('**/api/projects', async route => {
      if (route.request().method() === 'GET') {
          await route.fulfill({ json: [{ id: 'p1', name: 'Test Project', workflows: [] }] });
      } else if (route.request().method() === 'POST') {
          await route.fulfill({ json: { id: 'p1', name: 'Test Project' } });
      }
  });

  await page.route('**/api/workflows', async route => {
      await route.fulfill({ json: { id: 'w1', name: 'UI Test Flow', projectId: 'p1' } });
  });

  await page.route('**/api/workflows/w1', async route => {
      await route.fulfill({ json: { id: 'w1', name: 'UI Test Flow', nodes: {}, edges: [] } });
  });

  // Navigate to local app
  await page.goto('http://localhost:5173');

  // Wait for load
  await page.waitForTimeout(1000);

  // Click Sidebar "Workflow"
  const workflowLink = page.getByRole('link', { name: 'Workflow' }).or(page.locator('.menu a:has-text("Workflow")'));
  if (await workflowLink.count() > 0) {
      await workflowLink.click();
  } else {
      // Maybe it is just text
      await page.click('text=Workflow');
  }

  await page.waitForTimeout(1000);

  // Check if we need to create project
  const newProjectBtn = page.getByRole('button', { name: 'New Project' });
  if (await newProjectBtn.isVisible()) {
      console.log('On Dashboard');
      // Create Project
      await newProjectBtn.click();
      await page.fill('input[placeholder="e.g. Shopping App"]', 'Test Project');
      await page.getByRole('button', { name: 'Create Project' }).click();
      await page.waitForTimeout(500);

      // Create Workflow
      await page.click('text=New Workflow');
      await page.fill('input[placeholder="e.g. Login Flow"]', 'UI Test Flow');
      await page.click('button:has-text("Create Workflow")');
  }

  await page.waitForTimeout(2000);

  // 1. Screenshot Empty State
  await page.screenshot({ path: 'local_empty_state.png' });

  // 2. Click "Add first step"
  const addBtn = page.getByText('Add first step...');
  await addBtn.click();
  await page.waitForTimeout(1000);

  // 3. Screenshot Menu
  await page.screenshot({ path: 'local_node_menu.png' });

  // 4. Add Node (Manual Trigger)
  await page.keyboard.type('Manual');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // 5. Screenshot Node
  await page.screenshot({ path: 'local_node_added.png' });

});
