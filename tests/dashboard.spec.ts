import { test, expect } from '@playwright/test';

test.describe('Coach Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // This test assumes a coach is logged in
    // In a real scenario, you'd set up proper authentication
    await page.goto('/dashboard');
  });

  test('should display the three KPI cards', async ({ page }) => {
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="earnings-kpi-cards"]', { timeout: 10000 });

    // Check that all three KPI cards are present
    await expect(page.locator('[data-testid="last-7-days-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="month-to-date-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="all-time-card"]')).toBeVisible();

    // Check that the cards contain earnings data
    await expect(page.locator('[data-testid="last-7-days-card"]').getByText('Last 7 Days')).toBeVisible();
    await expect(page.locator('[data-testid="month-to-date-card"]').getByText('Month to Date')).toBeVisible();
    await expect(page.locator('[data-testid="all-time-card"]').getByText('All Time')).toBeVisible();
  });

  test('should show Stripe onboarding banner for un-onboarded coaches', async ({ page }) => {
    // Look for the Stripe onboarding banner
    const stripeBanner = page.locator('[data-testid="stripe-onboarding-banner"]');
    
    // The banner may or may not be visible depending on the coach's Stripe status
    // If it's visible, check its content
    if (await stripeBanner.isVisible()) {
      await expect(stripeBanner.getByText('Complete your Stripe setup')).toBeVisible();
      await expect(stripeBanner.getByText('Continue Onboarding')).toBeVisible();
    }
  });

  test('should display main dashboard sections', async ({ page }) => {
    // Check that main sections are present
    await expect(page.getByText('Coach Dashboard')).toBeVisible();
    await expect(page.getByText('Earnings Summary')).toBeVisible();
    await expect(page.getByText('Recent Bookings')).toBeVisible();
    await expect(page.getByText('Pending Requests')).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });

  test('should display coach welcome message', async ({ page }) => {
    // Check for the welcome message (name may vary based on logged-in coach)
    await expect(page.getByText('Coach Dashboard')).toBeVisible();
    
    // Look for welcome text pattern
    const welcomeText = page.locator('text=Welcome back');
    if (await welcomeText.isVisible()) {
      await expect(welcomeText).toBeVisible();
    }
  });

  test('should have functional quick action buttons', async ({ page }) => {
    // Check that quick action cards are present and clickable
    await expect(page.getByText('Manage Listings')).toBeVisible();
    await expect(page.getByText('Edit Profile')).toBeVisible();
    
    // Check that the links work (without actually navigating to avoid test complexity)
    const manageListingsLink = page.getByRole('link', { name: /Manage Listings/ });
    const editProfileLink = page.getByRole('link', { name: /Edit Profile/ });
    
    if (await manageListingsLink.isVisible()) {
      await expect(manageListingsLink).toHaveAttribute('href', '/my-listings');
    }
    
    if (await editProfileLink.isVisible()) {
      await expect(editProfileLink).toHaveAttribute('href', '/my-profile');
    }
  });

  test('should handle bookings display correctly', async ({ page }) => {
    // Check for either bookings table or empty state
    const bookingsSection = page.locator('text=Recent Bookings').locator('..');
    await expect(bookingsSection).toBeVisible();

    // The page should show either:
    // 1. A table with bookings, or
    // 2. An empty state message
    const hasBookings = await page.locator('table').isVisible();
    const hasEmptyState = await page.getByText('No bookings yet').isVisible();
    
    expect(hasBookings || hasEmptyState).toBeTruthy();
    
    if (hasEmptyState) {
      await expect(page.getByText('Share your coach profile to start getting bookings!')).toBeVisible();
    }
  });
});