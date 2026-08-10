const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log("Starting full UAT Test with error logging...");
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Log all browser console messages and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    page.on('requestfailed', request => {
      console.log('PAGE REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    console.log("Navigating to http://localhost:3000 ...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Try clicking the actual button instead of calling the function directly
    console.log("Clicking the SRS button...");
    const waterBtn = await page.$('#srs-water-btn');
    if (waterBtn) {
       await waterBtn.click();
    } else {
       console.log("WARNING: #srs-water-btn not found. It might not be in the initial view.");
       // Let's call the function directly if button is missing, just to check.
       await page.evaluate(() => window.startSrsSession('normal'));
    }
    
    await new Promise(r => setTimeout(r, 1000)); 
    
    const display = await page.evaluate(() => {
      const el = document.getElementById('srs-view');
      return window.getComputedStyle(el).display;
    });
    
    console.log(`After trigger #srs-view display: ${display}`);
    
  } catch (error) {
    console.error("❌ UAT Failed:", error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
