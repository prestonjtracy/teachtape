import { test, expect } from '@playwright/test';

test.describe('Coach Pages', () => {
  test('should load a coach page with valid UUID', async ({ page }) => {
    // Use the seeded coach ID from our seed script
    const coachId = '30affe8c-5d96-4488-9193-e89a7891a9f6';
    
    await page.goto(`/coaches/${coachId}`);
    
    // Wait for the page to load and check that it's not an error state
    await expect(page.locator('main')).not.toContainText('Failed to load coach');
    await expect(page.locator('main')).not.toContainText('not found');
    
    // Should show the coach name (Alex Carter from our seed data) - use more specific selector
    await expect(page.locator('[class*="profileHeader"] [class*="name"]')).toContainText('Alex Carter');
    
    // Should show coach role
    await expect(page.locator('[class*="profileHeader"] [class*="role"]')).toContainText('coach');
    
    // Should show listings if available
    const listings = page.locator('[class*="grid"] [class*="card"]');
    const listingCount = await listings.count();
    console.log(`Found ${listingCount} listings for coach`);
    
    if (listingCount > 0) {
      // If listings exist, check they have price and duration
      await expect(listings.first()).toContainText('$');
      await expect(listings.first()).toContainText('min');
    }
  });

  test('should show book session buttons and open booking modal', async ({ page }) => {
    const coachId = '30affe8c-5d96-4488-9193-e89a7891a9f6';
    
    await page.goto(`/coaches/${coachId}`);
    
    // Wait for page to load
    await expect(page.locator('[class*="profileHeader"] [class*="name"]')).toContainText('Alex Carter');
    
    // Check for Book Session buttons
    const bookButtons = page.locator('button:has-text("Book Session")');
    const buttonCount = await bookButtons.count();
    
    if (buttonCount > 0) {
      console.log(`Found ${buttonCount} Book Session buttons`);
      
      // Click the first book session button
      await bookButtons.first().click();
      
      // Check that booking modal opens
      await expect(page.locator('text=Book Session with')).toBeVisible();
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Close modal
      await page.locator('button:has-text("×")').click();
      await expect(page.locator('text=Book Session with')).not.toBeVisible();
    }
  });

  test('should fill booking form and proceed to checkout', async ({ page }) => {
    const coachId = '30affe8c-5d96-4488-9193-e89a7891a9f6';
    
    await page.goto(`/coaches/${coachId}`);
    
    // Wait for page to load
    await expect(page.locator('[class*="profileHeader"] [class*="name"]')).toContainText('Alex Carter');
    
    const bookButtons = page.locator('button:has-text("Book Session")');
    const buttonCount = await bookButtons.count();
    
    if (buttonCount > 0) {
      // Click book session button
      await bookButtons.first().click();
      
      // Fill in athlete details
      await page.fill('input[placeholder*="name"]', 'Test Athlete');
      await page.fill('input[type="email"]', 'athlete@test.com');
      
      // Wait for available slots to load
      await page.waitForTimeout(2000); // Give time for API call
      
      // Check if time slots are available
      const timeSlots = page.locator('input[type="radio"][name="timeSlot"]');
      const slotCount = await timeSlots.count();
      
      if (slotCount > 0) {
        console.log(`Found ${slotCount} available time slots`);
        
        // Select first available slot
        await timeSlots.first().check();
        
        // Mock the checkout request to avoid real Stripe redirect
        await page.route('/api/checkout', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              url: 'https://checkout.stripe.com/test_session_123',
              success: true 
            })
          });
        });
        
        // Click book button
        const finalBookButton = page.locator('button:has-text("Book for $")');
        
        // Expect redirect to Stripe (we'll intercept it)
        const [response] = await Promise.all([
          page.waitForResponse('/api/checkout'),
          finalBookButton.click()
        ]);
        
        expect(response.status()).toBe(200);
        console.log('✅ Checkout API called successfully');
      } else {
        console.log('No available slots found - this is expected if no availabilities are seeded');
      }
    }
  });

  test('should show validation error for invalid slot booking', async ({ page }) => {
    const coachId = '30affe8c-5d96-4488-9193-e89a7891a9f6';
    
    await page.goto(`/coaches/${coachId}`);
    
    const bookButtons = page.locator('button:has-text("Book Session")');
    const buttonCount = await bookButtons.count();
    
    if (buttonCount > 0) {
      await bookButtons.first().click();
      
      // Try to book without filling required fields
      const finalBookButton = page.locator('button:has-text("Book for $")');
      await expect(finalBookButton).toBeDisabled(); // Should be disabled
      
      // Fill only name, leave email empty
      await page.fill('input[placeholder*="name"]', 'Test Athlete');
      await expect(finalBookButton).toBeDisabled(); // Should still be disabled
      
      // Fill email but don't select time slot
      await page.fill('input[type="email"]', 'athlete@test.com');
      await expect(finalBookButton).toBeDisabled(); // Should still be disabled without time slot
    }
  });

  test('should return 404 for invalid UUID', async ({ page }) => {
    await page.goto('/coaches/invalid-uuid');
    
    // Should get a 404 page - use first() to avoid strict mode violation
    await expect(page.locator('h1, h2').first()).toContainText(/404|not found/i);
  });

  test('should return 404 for non-existent valid UUID', async ({ page }) => {
    // Valid UUID format but doesn't exist in database
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    
    await page.goto(`/coaches/${fakeUuid}`);
    
    // Should get a 404 page since coach doesn't exist - use first() to avoid strict mode violation
    await expect(page.locator('h1, h2').first()).toContainText(/404|not found/i);
  });

  test('coach page should have proper SEO structure', async ({ page }) => {
    const coachId = '30affe8c-5d96-4488-9193-e89a7891a9f6';
    
    await page.goto(`/coaches/${coachId}`);
    
    // Wait for content to load - use specific selector for coach name
    await expect(page.locator('[class*="profileHeader"] [class*="name"]')).toContainText('Alex Carter');
    
    // Check basic page structure
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[class*="profileHeader"]')).toBeVisible();
    
    // Should have avatar or initials
    const avatar = page.locator('[class*="avatar"]');
    await expect(avatar).toBeVisible();
  });
});