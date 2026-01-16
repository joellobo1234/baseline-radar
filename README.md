# Baseline Radar 📡

![Baseline Radar Logo](icons/baseline-logo.png)

**Baseline Radar** (formerly Baseline Inspector) is a powerful Chrome extension that helps developers and QA engineers analyze web pages for browser compatibility status. It scans the current page's HTML, CSS, and JavaScript usage and validates it against the official [Web Platform Baseline](https://web.dev/baseline/) data.

## 🚀 Features

-   **Deep Page Analysis**: Scans the DOM, stylesheets, and scripts to identify used web platform features.
-   **Baseline Categorization**: detailed breakdown of features into three categories:
    -   🟢 **Widely Available**: Safe to use across all major browsers (Baseline High).
    -   🟡 **Newly Available**: Interoperable across major browsers but relatively new (Baseline Low).
    -   🔴 **Limited**: Experimental or legacy features with limited support.
-   **Interactive Dashboard**: View a history of your analyses and verify site health over time.
-   **Detailed Insights**: Click on any detected feature to see specific browser support details (Chrome, Firefox, Safari, Edge).
-   **Filter & Search**: Quickly filter results by technology (HTML, CSS, JS) or Status.
-   **Export Reports**: Download analysis results as JSON for further processing or reporting.
-   **Auto-Sync**: Automatically fetches the latest [web-features](https://github.com/web-platform-dx/web-features) data weekly to keep your compatibility checks up-to-date.

## 🔍 How It Works

Baseline Radar operates by performing a real-time static analysis of the webpage currently in your view:

1.  **Data Synchronization**: The extension downloads and caches the latest `web-features` dataset from the Web Platform DX project. This ensures you are checking against the most current browser compatibility data.
2.  **Content Extraction**:
    -   **HTML**: It traverses the DOM to identify all active HTML tags and attributes.
    -   **CSS**: It scans both inline styles and attached stylesheets (handling CORS where possible) to parse used CSS properties and values.
    -   **JavaScript**: It analyzes script content to detect usage of modern APIs (like `IntersectionObserver`, `fetch`, etc.) based on keyword matching logic.
3.  **Validation & Matching**: Extracted features are cross-referenced with the local Baseline database. Each match is then tagged with its specific availability status (Widely, Newly, Limited).
4.  **Reporting**: Final results are aggregated and presented in the popup interface, complete with support matrices for each browser.

## 🛠️ Installation

Since this is a developer tool, you can install it directly from the source code:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/joellobo1234/baseline-radar.git
    ```
2.  **Open Chrome Extensions**:
    -   Navigate to `chrome://extensions/` in your browser.
    -   Enable **Developer mode** (toggle in the top-right corner).
3.  **Load Unpacked**:
    -   Click the **Load unpacked** button.
    -   Select the folder where you cloned this repository (the folder containing `manifest.json`).
4.  **Ready to Radar**: The Baseline Radar icon will appear in your toolbar.

## 📖 Usage

1.  Navigate to any website you want to inspect.
2.  Click the **Baseline Radar** icon in the toolbar.
3.  Click **"Analyze Current Page"**.
4.  Review the report! You can filter by "CSS", "JS", or "HTML" to narrow down the results.

## 🤝 Contributing

Contributions are welcome! If you have ideas for better feature detection logic or UI improvements, please feel free to open an issue or submit a pull request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Powered by [web-features](https://github.com/web-platform-dx/web-features) data.*
