// Baseline Inspector Background Service Worker
const WEB_FEATURES_CDN = 'https://unpkg.com/web-features/data.json';
const UPDATE_ALARM_NAME = 'update-baseline-data';

// 1. Initialize & Fetch Data on Install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);

  // Setup context menus
  setupContextMenus();

  // Fetch initial data immediately
  await updateBaselineData();

  // Test Notification on Install
  chrome.notifications.create('install-test', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Baseline Inspector Installed',
    message: 'Extension is ready. Notifications are working.',
    priority: 2
  });

  // Schedule weekly updates
  chrome.alarms.create(UPDATE_ALARM_NAME, {
    periodInMinutes: 60 * 24 * 7 // Weekly
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    updateBaselineData();
  }
});

// 2. Data Fetching Logic
async function updateBaselineData() {
  console.log('🔄 Fetching latest Baseline data...');
  try {
    const response = await fetch(WEB_FEATURES_CDN);
    if (!response.ok) throw new Error('Network response was not ok');

    const rawData = await response.json();
    const processedData = processWebFeatures(rawData);

    // Save to storage
    await chrome.storage.local.set({
      baselineData: processedData,
      lastUpdated: new Date().toISOString()
    });

    console.log(`✅ Baseline data updated: ${Object.keys(processedData).length} features loaded`);
  } catch (error) {
    console.error('❌ Failed to update Baseline data:', error);
  }
}

// 3. Process Raw Data into Optimization Map
function processWebFeatures(data) {
  // Convert the complex web-features structure into a simple lookup map for our content script
  const features = {};

  Object.entries(data.features || {}).forEach(([key, value]) => {
    // We only care about features that have a valid status
    if (!value.status) return;

    // Determine simple status string
    let simpleStatus = 'limited';
    if (value.status.baseline === 'high') simpleStatus = 'widely';
    else if (value.status.baseline === 'low') simpleStatus = 'newly';

    // Improved Heuristic for Type Detection
    let type = 'js';

    const cssKeywords = ['grid', 'flexbox', 'mask', 'filter', 'transform', 'transition', 'animation', 'backdrop', 'border', 'background', 'font', 'text', 'color', 'margin', 'padding'];
    const isCssId = cssKeywords.some(k => key.includes(k));

    if (
      key.includes(':') ||
      key.startsWith('@') ||
      value.name.startsWith('CSS') ||
      (value.spec && value.spec.includes('css')) ||
      isCssId
    ) {
      type = 'css';
    } else if (/^[a-z0-9-]+$/.test(key) && !key.includes('api') && !key.includes('.') &&
      (value.name.includes('element') || value.name.includes('attribute') || key.startsWith('html'))) {
      type = 'html';
    } else {
      type = 'js';
    }

    features[key] = {
      id: key,
      name: value.name,
      // Strip HTML and truncate description for lighter storage
      description: value.description_html ? value.description_html.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : value.name,
      status: simpleStatus,
      spec: value.spec,
      // Correctly map the support object for the popup
      browserSupport: value.status.support || {},
      type: type
    };
  });

  return features;
}

function setupContextMenus() {
  chrome.contextMenus.create({
    id: 'analyze-page',
    title: 'Analyze page for Baseline features',
    contexts: ['page']
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'analyze-page') {
    chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
  }
});

// Pass data to popup or content script if requested
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBaselineData') {
    chrome.storage.local.get(['baselineData', 'lastUpdated'], (result) => {
      sendResponse(result);
    });
    return true; // async
  }

  if (request.action === 'analysisComplete') {
    console.log('🔔 Notification request received:', request);

    // Explicitly resolve icon URL
    const iconUrl = chrome.runtime.getURL('icons/icon128.png');

    chrome.notifications.create(`analysis-${Date.now()}`, {
      type: 'basic',
      iconUrl: iconUrl,
      title: 'Analysis Complete',
      message: `Found ${request.count} features on ${request.title || 'current page'}`,
      priority: 2,
      requireInteraction: true
    }, (id) => {
      if (chrome.runtime.lastError) {
        console.error('Notification failed:', chrome.runtime.lastError);
        // Fallback to purely text if icon fails? No, basic type needs icon.
        // Fallback to internal icon name if possible?
      } else {
        console.log('Notification created with ID:', id);
      }
    });
  }

  if (request.action === 'triggerSync') {
    updateBaselineData()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }
});