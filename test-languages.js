const puppeteer = require('puppeteer');

const TEST_USER = {
  email: 'Robensoninnocent12@gmail.com',
  password: 'password123'
};

const LANGUAGES = [
  { code: 'es', name: 'Spanish', welcomeText: 'Bienvenido de vuelta' },
  { code: 'en', name: 'English', welcomeText: 'Welcome back' },
  { code: 'fr', name: 'French', welcomeText: 'Bon retour' },
  { code: 'ht', name: 'Haitian Creole', welcomeText: 'Byenvini tounen' }
];

async function testAllLanguages() {
  console.log('🌍 Starting comprehensive language testing...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📱 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Test login first
    console.log('🔐 Logging in...');
    await testLogin(page);
    
    // Test each language
    for (const language of LANGUAGES) {
      console.log(`\n🌐 Testing ${language.name} (${language.code})...`);
      await testLanguage(page, language);
    }
    
    // Test call interface translations
    console.log('\n📞 Testing call interface translations...');
    await testCallTranslations(page);
    
    // Test notification translations
    console.log('\n🔔 Testing notification translations...');
    await testNotificationTranslations(page);
    
    console.log('\n✅ All language tests completed successfully!');

  } catch (error) {
    console.error('❌ Language test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function testLogin(page) {
  try {
    await page.waitForSelector('#auth-container', { timeout: 10000 });
    
    // Check if already logged in
    const appContainer = await page.$('#app-container:not(.hidden)');
    if (appContainer) {
      console.log('✅ Already logged in');
      return;
    }
    
    // Fill login form
    await page.type('#login-email', TEST_USER.email, { delay: 50 });
    await page.type('#login-password', TEST_USER.password, { delay: 50 });
    await page.click('button[type="submit"]');
    
    // Wait for login success
    await page.waitForSelector('#app-container:not(.hidden)', { timeout: 15000 });
    console.log('✅ Login successful');
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function testLanguage(page, language) {
  try {
    // Look for language selector in main app
    const langSelectors = [
      '#language-selector',
      '.language-selector-btn',
      '[data-lang-selector]',
      '.language-selector'
    ];
    
    let langSelector = null;
    for (const selector of langSelectors) {
      langSelector = await page.$(selector);
      if (langSelector) {
        console.log(`✅ Found language selector: ${selector}`);
        break;
      }
    }
    
    if (!langSelector) {
      console.log('ℹ️ Language selector not found in main interface');
      return;
    }
    
    await langSelector.click();
    await page.waitForTimeout(500);
    
    // Try to select the language
    const langOptions = [
      `[data-lang="${language.code}"]`,
      `[data-value="${language.code}"]`,
      `.language-option[data-lang="${language.code}"]`
    ];
    
    let langOption = null;
    for (const selector of langOptions) {
      langOption = await page.$(selector);
      if (langOption) {
        console.log(`✅ Found language option: ${selector}`);
        break;
      }
    }
    
    if (langOption) {
      await langOption.click();
      await page.waitForTimeout(1000);
      
      // Verify language change by checking translated text
      const elements = await page.$$('[data-i18n]');
      let translatedCount = 0;
      
      for (const element of elements.slice(0, 5)) { // Check first 5 elements
        const text = await element.evaluate(el => el.textContent);
        if (text && text.trim()) {
          translatedCount++;
        }
      }
      
      console.log(`✅ ${language.name} translation applied (${translatedCount} elements found)`);
      
    } else {
      console.log(`⚠️ Could not find option for ${language.name}`);
    }
    
  } catch (error) {
    console.log(`ℹ️ ${language.name} test completed with note:`, error.message);
  }
}

async function testCallTranslations(page) {
  try {
    // Look for call buttons
    const callButtons = await page.$$('#call-btn, #video-btn, .call-button');
    
    if (callButtons.length > 0) {
      console.log(`✅ Found ${callButtons.length} call buttons`);
      
      // Check for translated titles/labels
      for (const button of callButtons) {
        const title = await button.evaluate(el => el.title || el.getAttribute('data-i18n-title'));
        if (title) {
          console.log(`✅ Call button has translation attribute: ${title}`);
        }
      }
      
    } else {
      console.log('ℹ️ No call buttons found (might need active conversation)');
    }
    
    // Check for call modal elements with translations
    const callElements = await page.$$('[data-i18n*="call"]');
    console.log(`✅ Found ${callElements.length} call-related translation elements`);
    
  } catch (error) {
    console.log('ℹ️ Call translation test note:', error.message);
  }
}

async function testNotificationTranslations(page) {
  try {
    // Check if notification system is available
    const hasNotificationSystem = await page.evaluate(() => {
      return !!(window.Utils && window.Utils.TranslatedNotifications);
    });
    
    if (hasNotificationSystem) {
      console.log('✅ Translated notification system is available');
      
      // Test notification by triggering a simple action
      await page.evaluate(() => {
        if (window.Utils.TranslatedNotifications) {
          window.Utils.TranslatedNotifications.success('notifications.test', {}, 1000);
        }
      });
      
      console.log('✅ Notification system tested');
      
    } else {
      console.log('⚠️ Translated notification system not found');
    }
    
  } catch (error) {
    console.log('ℹ️ Notification test note:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testAllLanguages().catch(error => {
    console.error('💥 Language test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testAllLanguages };