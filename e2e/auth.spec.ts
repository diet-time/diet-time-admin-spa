import { expect, test } from '@playwright/test';
test('bypasses login during development',async({page})=>{await page.goto('/login',{waitUntil:'domcontentloaded'});await expect(page).toHaveURL('/');await expect(page.getByText('Diet Time Admin').first()).toBeVisible()});
