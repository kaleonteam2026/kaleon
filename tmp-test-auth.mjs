import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const BASE = 'http://localhost:5173';

// Capture console logs from the page
page.on('console', msg => {
  if (msg.type() === 'error') console.log('[PAGE ERROR]', msg.text());
});

// 1. Go to the auth page — wait for full render
await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Debug: get the page title and key HTML
const title = await page.title();
console.log('Title:', title);

// Get all visible text to understand page structure
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('\n=== VISIBLE PAGE TEXT ===');
console.log(bodyText.substring(0, 500));
console.log('========================\n');

// Check email input existence
const emailInput = await page.$('input[type="email"]');
console.log('Email input found:', !!emailInput);

if (emailInput) {
  // Get input details
  const inputType = await emailInput.getAttribute('type');
  const inputPlaceholder = await emailInput.getAttribute('placeholder');
  console.log(`Input type="${inputType}" placeholder="${inputPlaceholder}"`);

  // Fill and submit
  await emailInput.fill('test@example.com');

  // Find submit button
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    const btnText = await submitBtn.textContent();
    console.log('Submit button text:', `"${btnText?.trim()}"`);

    if (btnText?.includes('Send') || btnText?.includes('verification')) {
      console.log('✅ Button says "Send verification code" (not "Send link")');
    }

    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Check for OTP screen
    const otpInput = await page.$('input[inputmode="numeric"]');
    console.log('\nOTP input found after submit:', !!otpInput);

    const body2 = await page.evaluate(() => document.body.innerText);
    console.log('Post-submit visible text:');
    console.log(body2.substring(0, 500));

    if (body2.includes('code') && !body2.includes('magic link')) {
      console.log('\n✅ OTP screen shows "verification code" terminology');
    } else if (body2.includes('magic link')) {
      console.log('❌ Still showing "magic link"');
    }
  } else {
    console.log('❌ No submit button found');
  }
}

await page.screenshot({ path: '/tmp/auth-page.png', fullPage: true });
console.log('\n📸 Screenshot: /tmp/auth-page.png');

await browser.close();
