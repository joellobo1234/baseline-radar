(function () {
  'use strict';

  console.log('🔍 Baseline Inspector: Enhanced Content Script Initialized');

  if (window.baselineInspectorLoaded) {
    console.log('Content script already loaded, skipping...');
    return;
  }
  window.baselineInspectorLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    if (request.action === 'analyze') {
      (async () => {
        try {
          const results = await analyzeCurrentPage();
          console.log('✅ Full Analysis Complete:', results);

          // Enriched results with metadata
          const enrichedResults = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            features: results,
            summary: {
              total: results.length,
              widely: results.filter(f => f.status === 'widely').length,
              newly: results.filter(f => f.status === 'newly').length,
              limited: results.filter(f => f.status === 'limited').length
            }
          };

          console.log('✅ Full Analysis Complete:', enrichedResults);

          // Get existing history to append
          const storage = await chrome.storage.local.get(['analysisHistory']);
          let history = storage.analysisHistory || [];

          // Add new result to top
          history.unshift(enrichedResults);

          // Limit history to last 50 entries to save space
          if (history.length > 50) history = history.slice(0, 50);

          // Save to storage immediately so result persists even if popup closes
          await chrome.storage.local.set({
            lastAnalysis: enrichedResults,
            analysisHistory: history,
            isAnalyzing: false // Clear flag
          });

          // Notify background script (trigger notification)
          chrome.runtime.sendMessage({
            action: 'analysisComplete',
            title: document.title,
            count: results.length
          });

          sendResponse({ success: true, features: results });
        } catch (error) {
          console.error('❌ Analysis error:', error);
          await chrome.storage.local.set({ isAnalyzing: false });
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    if (request.action === 'getFeatures') {
      (async () => {
        try {
          const results = await analyzeCurrentPage();
          sendResponse({ features: results });
        } catch (error) {
          sendResponse({ features: [] });
        }
      })();
      return true;
    }
  });

  // -------------------- 🔍 UNIFIED ANALYSIS --------------------
  async function analyzeCurrentPage() {
    console.log('Starting full page analysis...');

    // 1. Get Dynamic Data from Storage
    const storageData = await chrome.storage.local.get(['baselineData']);
    const dynamicFeatures = storageData.baselineData || {};

    // 2. Prepare Feature Databases
    const db = { css: {}, html: {}, js: {} };
    Object.values(dynamicFeatures).forEach(f => {
      // Normalize data for usage
      const feature = {
        id: f.id,
        name: f.name,
        status: f.status,
        group: f.type, // 'css', 'html', or 'js'
        description: f.description,
        element: f.id,
        browserSupport: f.browserSupport
      };

      if (f.type === 'css') db.css[f.id] = feature;
      else if (f.type === 'html') db.html[f.id] = feature;
      else db.js[f.id] = feature;
    });

    // 3. Run Analysis
    const cssFeatures = await analyzeCSSFeatures(db.css);
    const htmlFeatures = analyzeHTMLFeatures(db.html);
    const jsFeatures = await analyzeJSFeatures(db.js);

    const combined = [...cssFeatures, ...htmlFeatures, ...jsFeatures];
    console.log(`📊 Combined Feature Count: ${combined.length}`);

    return combined;
  }

  // -------------------- 🧩 CSS ANALYSIS --------------------
  async function analyzeCSSFeatures(featureDb) {
    const foundFeatures = [];
    const seenFeatures = new Set();

    // Helper to scan text
    const scanText = (text) => {
      if (!text) return;
      text = text.toLowerCase();
      Object.entries(featureDb).forEach(([pattern, feature]) => {
        if (text.includes(pattern)) {
          if (!seenFeatures.has(pattern)) {
            foundFeatures.push(feature);
            seenFeatures.add(pattern);
          }
        }
      });
    };

    // 1. Scan Inline Styles
    document.querySelectorAll('[style]').forEach(el => scanText(el.getAttribute('style')));

    // 2. Scan Stylesheets (Handle CORS)
    const stylesheets = Array.from(document.styleSheets);
    for (const sheet of stylesheets) {
      try {
        // Try accessing rules directly (Fastest)
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => scanText(rule.cssText));
      } catch (e) {
        // CORS Error - Fetch manually
        if (sheet.href) {
          try {
            // We use a simple fetch here. Content scripts satisfy CORS if the extension has permissions.
            // However, often strictly blocked resources fail. 
            // Ideally, we'd message the background script to fetch, but let's try direct first.
            const res = await fetch(sheet.href).catch(() => null);
            if (res && res.ok) {
              const text = await res.text();
              scanText(text);
            }
          } catch (err) {
            // Ignore stylesheet fetch errors
          }
        }
      }
    }

    return foundFeatures;
  }

  // -------------------- 🧱 HTML ANALYSIS --------------------
  function analyzeHTMLFeatures(featureDb) {
    const foundFeatures = [];
    const seenFeatures = new Set();

    const allElements = Array.from(document.querySelectorAll('*'));
    const uniqueTags = new Set(allElements.map(el => el.tagName.toLowerCase()));

    uniqueTags.forEach(tag => {
      // Match tag against keys in DB
      // Keys might be 'dialog', 'html-dialog', 'element-dialog'
      // We look for partial matches or direct matches
      Object.values(featureDb).forEach(feature => {
        if (feature.id === tag || feature.id === `html-${tag}` || feature.id.endsWith(`-${tag}`)) {
          if (!seenFeatures.has(feature.id)) {
            foundFeatures.push(feature);
            seenFeatures.add(feature.id);
          }
        }
      });
    });

    return foundFeatures;
  }

  // -------------------- ⚙️ JS ANALYSIS --------------------
  async function analyzeJSFeatures(featureDb) {
    const foundFeatures = [];
    const seenFeatures = new Set();
    const scripts = Array.from(document.querySelectorAll('script'));

    for (const script of scripts) {
      let code = '';
      try {
        if (script.src) {
          // Only fetch reasonable sized scripts or local ones
          // Skipping huge tracking scripts to save perf
          if (!script.src.includes('google-analytics') && !script.src.includes('doubleclick')) {
            const res = await fetch(script.src).catch(() => null);
            if (res && res.ok) code = await res.text();
          }
        } else {
          code = script.textContent;
        }

        if (code) {
          const codeLower = code.toLowerCase();
          Object.values(featureDb).forEach(feature => {
            // Smart Matching:
            // 1. Match exact ID (e.g. "fetch")
            // 2. Match ID with hyphens removed (e.g. "intersection-observer" -> "intersectionobserver") in case of JS classes
            const idClean = feature.id.replace(/-/g, '').toLowerCase();

            if (feature.id.length > 2 &&
              (code.includes(feature.id) || codeLower.includes(idClean))) {
              if (!seenFeatures.has(feature.id)) {
                foundFeatures.push(feature);
                seenFeatures.add(feature.id);
              }
            }
          });
        }
      } catch (err) {
        // Ignore fetch errors
      }
    }

    return foundFeatures;
  }

  console.log('✅ Baseline Inspector Content Script Ready');
})();
