class HistoryManager {
    constructor() {
        this.history = [];
        this.selectedIds = new Set();
        this.init();
    }

    async init() {
        await this.loadHistory();
        this.bindEvents();
        this.render();
    }

    async loadHistory() {
        try {
            const data = await chrome.storage.local.get(['analysisHistory']);
            // Ensure each item has a unique ID for selection tracking if not present
            this.history = (data.analysisHistory || []).map((item, index) => ({
                ...item,
                _id: item.timestamp + '_' + index // Create a synthetic ID
            }));
        } catch (e) {
            console.error('Failed to load history', e);
        }
    }

    bindEvents() {
        // Filters
        document.getElementById('searchInput').addEventListener('input', () => this.render());
        document.getElementById('dateInput').addEventListener('change', () => this.render());

        // Selection
        document.getElementById('selectAll').addEventListener('change', (e) => this.toggleAll(e.target.checked));

        // Actions
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('exportSelectedBtn').addEventListener('click', () => this.exportSelected());

        // Detail View Filters
        document.querySelectorAll('.detail-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.detail-filters .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDetailFilter = btn.dataset.filter;
                this.renderDetailFeatures();
            });
        });

        // Back Button
        document.getElementById('backBtn').addEventListener('click', () => this.hideDetail());
    }

    getFilteredHistory() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const date = document.getElementById('dateInput').value;

        return this.history.filter(item => {
            // Search URL
            if (search && !item.url.toLowerCase().includes(search)) return false;

            // Filter Date (YYYY-MM-DD)
            if (date) {
                const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
                if (itemDate !== date) return false;
            }

            return true;
        });
    }

    showDetail(id) {
        const item = this.history.find(h => h._id === id);
        if (!item) return;

        this.currentDetailItem = item;
        this.currentDetailFilter = 'all';

        // Populate Header
        document.getElementById('detailUrl').textContent = item.url;
        document.getElementById('detailDate').textContent = new Date(item.timestamp).toLocaleString();

        // Stats
        document.getElementById('detailStats').innerHTML = `
            <div class="stat-item"><span class="pill widely">${item.summary.widely} Widely</span></div>
            <div class="stat-item"><span class="pill newly">${item.summary.newly} Newly</span></div>
            <div class="stat-item"><span class="pill limited">${item.summary.limited} Limited</span></div>
            <div class="stat-item"><strong>${item.summary.total}</strong> Total Features</div>
        `;

        // Reset filters
        document.querySelectorAll('.detail-filters .filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.detail-filters .filter-btn[data-filter="all"]').classList.add('active');

        this.renderDetailFeatures();

        document.getElementById('tableView').style.display = 'none';
        document.getElementById('detailView').style.display = 'block';
    }

    hideDetail() {
        document.getElementById('detailView').style.display = 'none';
        document.getElementById('tableView').style.display = 'block';
        this.currentDetailItem = null;
    }

    renderDetailFeatures() {
        if (!this.currentDetailItem) return;

        const container = document.getElementById('detailFeatureList');
        let features = this.currentDetailItem.features;

        if (this.currentDetailFilter !== 'all') {
            features = features.filter(f => f.group === this.currentDetailFilter);
        }

        // Reuse escape utility
        const escapeHtml = (unsafe) => {
            return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        };

        container.innerHTML = features.map(feature => `
            <div class="feature-card ${feature.status}">
                <div class="card-header">
                    <span class="card-title">${escapeHtml(feature.name)}</span>
                    <div class="status-indicator ${feature.status}"></div>
                </div>
                <p class="card-desc">${escapeHtml(feature.description)}</p>
                <div class="card-meta">
                    <span class="meta-group">${feature.group}</span>
                    <div class="browser-icons">
                        ${this.renderBrowserSupport(feature.browserSupport)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderBrowserSupport(support) {
        const browsers = [
            { name: 'chrome', label: 'C' },
            { name: 'firefox', label: 'F' },
            { name: 'safari', label: 'S' },
            { name: 'edge', label: 'E' }
        ];
        return browsers.map(b => {
            const isSupported = support && support[b.name];
            const status = isSupported ? 'supported' : 'unsupported';
            const icon = isSupported ? '✓' : '✗';
            return `<div class="browser-icon ${status}" title="${b.label}">${icon}</div>`;
        }).join('');
    }

    render() {
        const list = this.getFilteredHistory();
        const tbody = document.getElementById('historyList');
        const empty = document.getElementById('emptyState');

        tbody.innerHTML = '';

        if (list.length === 0) {
            empty.style.display = 'block';
            document.getElementById('selectAll').checked = false;
            this.updateActionButtons();
            return;
        }
        empty.style.display = 'none';

        list.forEach(item => {
            const row = document.createElement('tr');
            const isSelected = this.selectedIds.has(item._id);

            row.innerHTML = `
        <td onclick="event.stopPropagation()"><input type="checkbox" class="select-item" data-id="${item._id}" ${isSelected ? 'checked' : ''}></td>
        <td onclick="this.parentNode.click()">${new Date(item.timestamp).toLocaleString()}</td>
        <td class="url-cell" title="${item.url}" onclick="this.parentNode.click()">
            <span class="url-link">${item.url}</span>
        </td>
        <td onclick="this.parentNode.click()">${item.summary.total}</td>
        <td onclick="this.parentNode.click()">
            <span class="pill widely">${item.summary.widely} Widely</span>
            <span class="pill newly">${item.summary.newly} Newly</span>
            <span class="pill limited">${item.summary.limited} Limited</span>
        </td>
        <td onclick="event.stopPropagation()">
            <button class="action-btn delete-single" data-id="${item._id}" title="Delete">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
             <button class="action-btn download-single" data-id="${item._id}" title="Download JSON">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
        </td>
      `;
            // Row click with delegation or direct
            row.addEventListener('click', () => this.showDetail(item._id));
            tbody.appendChild(row);
        });

        // Re-bind row events
        document.querySelectorAll('.select-item').forEach(cb => {
            cb.addEventListener('change', (e) => this.toggleItem(e.target.dataset.id, e.target.checked));
        });

        document.querySelectorAll('.delete-single').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteSingle(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.download-single').forEach(btn => {
            btn.addEventListener('click', (e) => this.downloadSingle(e.currentTarget.dataset.id));
        });

        this.updateActionButtons();
    }

    toggleAll(checked) {
        const list = this.getFilteredHistory();
        list.forEach(item => {
            if (checked) this.selectedIds.add(item._id);
            else this.selectedIds.delete(item._id);
        });
        this.render();
    }

    toggleItem(id, checked) {
        if (checked) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.updateActionButtons();
    }

    updateActionButtons() {
        const count = this.selectedIds.size;
        const exportBtn = document.getElementById('exportSelectedBtn');
        const deleteBtn = document.getElementById('deleteSelectedBtn');

        exportBtn.disabled = count === 0;
        deleteBtn.disabled = count === 0;
        exportBtn.textContent = count > 0 ? `Export ZIP (${count})` : 'Export ZIP';
        deleteBtn.textContent = count > 0 ? `Delete (${count})` : 'Delete';
    }

    async deleteSelected() {
        if (!confirm('Are you sure you want to delete selected items?')) return;

        this.history = this.history.filter(item => !this.selectedIds.has(item._id));
        this.selectedIds.clear();
        await this.save();
        this.render();
    }

    async deleteSingle(id) {
        if (!confirm('Delete this record?')) return;
        this.history = this.history.filter(item => item._id !== id);
        if (this.selectedIds.has(id)) this.selectedIds.delete(id);
        await this.save();
        this.render();
    }

    downloadSingle(id) {
        const item = this.history.find(h => h._id === id);
        if (!item) return;

        const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const outputName = `baseline-report-${new Date(item.timestamp).getTime()}.json`;

        chrome.downloads.download({
            url: url,
            filename: outputName,
            saveAs: true
        });
    }

    async exportSelected() {
        const zip = new JSZip();
        let count = 0;

        this.history.forEach(item => {
            if (this.selectedIds.has(item._id)) {
                const filename = `report-${new Date(item.timestamp).getTime()}-${count++}.json`;
                zip.file(filename, JSON.stringify(item, null, 2));
            }
        });

        try {
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            chrome.downloads.download({
                url: url,
                filename: `baseline-reports-archive.zip`,
                saveAs: true
            });
        } catch (e) {
            alert('Failed to generate ZIP: ' + e.message);
        }
    }

    async save() {
        // Remove the temporary _id before saving? Or keep it?
        // Let's strip it to match original format to avoid pollution
        const cleanHistory = this.history.map(({ _id, ...rest }) => rest);
        await chrome.storage.local.set({ analysisHistory: cleanHistory });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HistoryManager();
});
