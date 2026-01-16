console.log('Popup script loading...');

class BaselineInspectorPopup {
  constructor() {
    this.currentFilter = 'all';
    this.features = [];
    this.isEnabled = true;
    this.init();
  }

  init() {
    console.log('Popup initializing...');
    this.bindEvents();
    this.loadSettings();
  }

  async loadSettings() {
    try {
      // Load enabled state, last analysis results, and analysis state
      const settings = await chrome.storage.sync.get({ isEnabled: true });
      this.isEnabled = settings.isEnabled;
      this.updateToggleState();

      const localData = await chrome.storage.local.get(['lastAnalysis', 'isAnalyzing', 'analyzingTabId']);

      this.currentTabId = null;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTabId = tab ? tab.id : null;
      } catch (e) { }

      // Render previous analysis if available
      if (localData.lastAnalysis) {
        if (Array.isArray(localData.lastAnalysis)) {
          this.features = localData.lastAnalysis;
        } else if (localData.lastAnalysis.features) {
          this.features = localData.lastAnalysis.features;
          this.lastAnalysisUrl = localData.lastAnalysis.url;
        }

        if (this.features.length > 0) {
          this.renderFeatures();
          this.updateCounts();
        }
      }

      // Check if analysis is currently in progress for this tab
      if (localData.isAnalyzing && localData.analyzingTabId === this.currentTabId) {
        this.setAnalyzingState();
      } else {
        this.checkSmartButton();
      }

    } catch (error) {
      console.log('Could not load settings:', error);
    }
  }

  async checkSmartButton() {
    // If currently analyzing, don't change button state
    const localData = await chrome.storage.local.get(['isAnalyzing', 'analyzingTabId']);
    if (localData.isAnalyzing && localData.analyzingTabId === this.currentTabId) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const footer = document.querySelector('.footer');
      if (!footer || !tab) return;

      if (this.lastAnalysisUrl && tab.url === this.lastAnalysisUrl) {
        // Show Dual Buttons
        footer.innerHTML = `
            <div class="footer-actions">
                <button id="reanalyzeBtn" class="analyze-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                        <path d="M21 12v9"></path>
                    </svg>
                    Re-analyze Page
                </button>
                <button id="clearBtn" class="btn-secondary" title="New Analysis">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
         `;

        // Bind dynamic events
        document.getElementById('reanalyzeBtn').addEventListener('click', () => this.analyzeCurrentPage());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearUI());

      } else {
        // Reset to default single button
        this.resetAnalyzeButton();
      }
    } catch (e) { console.log(e); }
  }

  setAnalyzingState() {
    const footer = document.querySelector('.footer');
    if (footer) {
      footer.innerHTML = `
            <button id="analyzeBtn" class="analyze-btn" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
                Analyzing...
            </button>
         `;
    }
  }

  clearUI() {
    this.features = [];
    this.lastAnalysisUrl = null;
    this.showEmptyState();

    // Clear specific lastAnalysis but KEEP history
    chrome.storage.local.remove('lastAnalysis');

    this.resetAnalyzeButton();
  }

  updateToggleState() {
    // Deprecated - functionality removed
  }

  bindEvents() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderFeatures();
      });
    });

    // Analyze button - FIXED ID
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCurrentPage());
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportReport());
    }

    // Dashboard Button
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
      });
    }

    // Sync Button
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        const icon = syncBtn.querySelector('svg');
        if (icon) icon.classList.add('animate-spin');

        chrome.runtime.sendMessage({ action: 'triggerSync' }, (response) => {
          if (icon) icon.classList.remove('animate-spin');
          if (response && response.success) {
            this.showSuccessMessage('Baseline data synced successfully!');
          } else {
            this.showSuccessMessage('Sync failed. Check console.');
          }
        });
      });
    }

    // Storage listener for background/content script updates
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        // 1. Update Data First
        if (changes.lastAnalysis && changes.lastAnalysis.newValue) {
          const res = changes.lastAnalysis.newValue;
          this.features = res.features || res; // handle both formats
          this.lastAnalysisUrl = res.url;
          this.renderFeatures();
          this.updateCounts();
          this.showSuccessMessage(`Found ${this.features.length} features!`);
        }

        // 2. Update UI State
        if (changes.isAnalyzing && changes.isAnalyzing.newValue === false) {
          this.resetAnalyzeButton();
          this.checkSmartButton();
        }
      }
    });

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
      });
    }
  }

  async analyzeCurrentPage() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"></path>
        </svg>
        Analyzing...
      `;
      analyzeBtn.disabled = true;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Analyzing tab:', tab.url);

      // Check valid URL
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        alert('Cannot analyze browser internal pages. Try on a regular webpage.');
        this.resetAnalyzeButton();
        return;
      }

      // Set analyzing state immediately
      await chrome.storage.local.set({
        isAnalyzing: true,
        analyzingTabId: tab.id
      });

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'analyze' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not responding, injecting...');
          this.injectAndAnalyze(tab.id);
        } else {
          // The content script will handle the saving and notification
          // But if it returns synchronously (unlikely for heavy tasks but possible), we handle it here too.
          // Actually, let's let the storage listener handle the success UI updates to avoid double-toasts.
          if (!response || !response.success) {
            // Only handle errors here
            this.showEmptyState();
            this.resetAnalyzeButton();
            chrome.storage.local.set({ isAnalyzing: false });
          }
        }
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      this.showEmptyState();
      this.resetAnalyzeButton();
      chrome.storage.local.set({ isAnalyzing: false });
    }
  }

  async injectAndAnalyze(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'analyze' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Still no response:', chrome.runtime.lastError);
            this.showEmptyState();
          } else if (response && response.success && response.features) {
            this.features = response.features;
            this.renderFeatures();
            this.updateCounts();
          } else {
            this.showEmptyState();
          }
          this.resetAnalyzeButton();
        });
      }, 500);
    } catch (error) {
      console.error('Injection failed:', error);
      this.showEmptyState();
      this.resetAnalyzeButton();
    }
  }

  resetAnalyzeButton() {
    const footer = document.querySelector('.footer');
    if (footer) {
      // Reset to standard single Analyze button
      footer.innerHTML = `
            <button id="analyzeBtn" class="analyze-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Analyze Current Page
            </button>
         `;
      // Re-bind the event since we replaced the element
      document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeCurrentPage());
    }
  }

  renderFeatures() {
    const container = document.getElementById('featureList');
    const emptyState = document.getElementById('emptyState');

    if (!container || !emptyState) return;

    let filteredFeatures = this.features;

    if (this.currentFilter !== 'all') {
      filteredFeatures = this.features.filter(f => f.group === this.currentFilter);
    }

    if (filteredFeatures.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'flex';
      this.updateCounts(filteredFeatures); // Update with 0
      return;
    }

    emptyState.style.display = 'none';
    this.updateCounts(filteredFeatures); // Update with filtered list

    const validStatuses = ['widely', 'newly', 'limited'];

    // Safety: Function to escape HTML to prevent XSS and rendering issues
    const escapeHtml = (unsafe) => {
      return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    container.innerHTML = filteredFeatures
      .filter(f => f && f.name && f.name.trim() !== '' && validStatuses.includes(f.status))
      .map(feature => `
      <div class="feature-card ${feature.status}" data-feature="${feature.id}">
        <div class="feature-header">
          <div class="feature-info">
            <h3 class="feature-name">${escapeHtml(feature.name)}</h3>
            <p class="feature-description">${escapeHtml(feature.description)}</p>
            <div class="feature-meta">
              <span class="feature-group">${feature.group.toUpperCase()}</span>
              <span class="feature-element">${escapeHtml(feature.element)}</span>
            </div>
          </div>
          <div class="feature-status">
            <div class="status-indicator ${feature.status}"></div>
          </div>
        </div>
        
        <div class="browser-support">
          <span class="support-label">Browser Support:</span>
          <div class="browser-icons">
            ${this.renderBrowserSupport(feature.browserSupport)}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderBrowserSupport(support) {
    const browsers = [
      { name: 'chrome', label: 'Chrome' },
      { name: 'firefox', label: 'Firefox' },
      { name: 'safari', label: 'Safari' },
      { name: 'edge', label: 'Edge' }
    ];

    return browsers.map(browser => {
      const isSupported = support && support[browser.name];
      const icon = isSupported ? '✓' : '✗';
      const statusClass = isSupported ? 'supported' : 'unsupported';
      return `<span class="browser-support-icon ${statusClass}" title="${browser.label}">${icon}</span>`;
    }).join('');
  }

  updateCounts(featuresList) {
    // If specific list passed (e.g. from filter), use it. Otherwise use all features.
    // However, if we are filtering, we want the stats to reflect the FILTERED view.
    // The renderFeatures calls this with filteredFeatures.

    // Initial load/reset might check 'this.features' directly if we want global stats,
    // but USER asked for counts to update according to filter.
    const list = featuresList || this.features;

    const counts = list.reduce((acc, feature) => {
      acc[feature.status] = (acc[feature.status] || 0) + 1;
      return acc;
    }, {});

    const widelyCount = document.getElementById('widelyCount');
    const newlyCount = document.getElementById('newlyCount');
    const limitedCount = document.getElementById('limitedCount');

    if (widelyCount) widelyCount.textContent = counts.widely || 0;
    if (newlyCount) newlyCount.textContent = counts.newly || 0;
    if (limitedCount) limitedCount.textContent = counts.limited || 0;
  }

  exportReport() {
    if (this.features.length === 0) {
      alert('No features to export. Please analyze a page first.');
      return;
    }

    const report = {
      url: 'Current page',
      timestamp: new Date().toISOString(),
      summary: {
        total: this.features.length,
        widely: this.features.filter(f => f.status === 'widely').length,
        newly: this.features.filter(f => f.status === 'newly').length,
        limited: this.features.filter(f => f.status === 'limited').length
      },
      features: this.features
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `baseline-report-${Date.now()}.json`,
      saveAs: true
    });
  }

  showSuccessMessage(msg) {
    const existing = document.querySelector('.success-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = msg;

    // Simple inline styles for the toast
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px', // Above footer
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#10b981',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: '100',
      fontSize: '14px',
      fontWeight: '500',
      animation: 'fadeInOut 3s forwards'
    });

    // Add keyframes if not exists
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, 10px); }
                10% { opacity: 1; transform: translate(-50%, 0); }
                90% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -10px); }
            }
        `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 3000);
  }

  showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const featureList = document.getElementById('featureList');

    if (emptyState) emptyState.style.display = 'flex';
    if (featureList) featureList.innerHTML = '';

    this.updateCounts();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, initializing...');
  new BaselineInspectorPopup();
});

console.log('Popup script loaded successfully');