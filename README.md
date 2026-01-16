<h1 align="center">Baseline Radar</h1>

  <p align="center">
    <strong>Real-time Web Platform Baseline compatibility analysis right in your browser.</strong>
  </p>

  <p align="center">
    <a href="https://opensource.org/licenses/MIT">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT">
    </a>
    <a href="https://github.com/joellobo1234/baseline-radar/releases">
      <img src="https://img.shields.io/badge/version-1.0.0-blue.svg?style=flat-square" alt="Version">
    </a>
    <a href="https://web.dev/baseline/">
      <img src="https://img.shields.io/badge/Baseline-Compatible-green?style=flat-square&logo=googlechrome" alt="Baseline Compatible">
    </a>
  </p>

  <i>
    Make sure your web applications work for everyone, everywhere.
  </i>
  <br>
  <br>
</div>

---

| **Main Interface** | **Detailed Stats** |
|:---:|:---:|
| <img src="popup.png" alt="Main Popup Interface" width="350"/> | <img src="stats.png" alt="Statistics View" width="350"/> |

## 🌟 Overview

**Baseline Radar** extracts the specific web platform features (HTML, CSS, JavaScript) used on any webpage and validates them against the [Web Platform Baseline](https://web.dev/baseline/).

It helps developers and QA engineers instantly verify if their code relies on features that are:
- 🟢 **Widely Available**: Safe to use across all major browsers (Baseline High).
- 🟡 **Newly Available**: Interoperable but relatively new (Baseline Low).
- 🔴 **Limited**: Experimental or legacy features with poor support.

## 🚀 Features

- **🔎 Deep Analysis**: Scans live DOM, computed styles, and script content to detect feature usage.
- **📊 Interactive Dashboard**: Visual breakdown of features by category (CSS, JS, HTML) and status.
- **🛡️ Browser Compatibility**: Detailed support matrices for Chrome, Firefox, Safari, and Edge for every detected feature.
- **📥 Export Reports**: Download analysis results as JSON for compliance reporting or offline review.
- **🔄 Auto-Sync**: Automatically updates feature data from [web-features](https://github.com/web-platform-dx/web-features) weekly.
- **⚡️ Zero-Config**: Just install and click "Analyze" — no build steps required for the user.

## 🛠️ Installation

Since this tool is currently in **developer preview**, you can install it as an unpacked extension:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/joellobo1234/baseline-radar.git
   cd baseline-radar
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/` in your browser address bar.
   - Toggle **Developer mode** on in the top-right corner.

3. **Load the Extension**
   - Click the **Load unpacked** button.
   - Select the `baseline-radar` folder (the directory containing `manifest.json`).

4. **Pin & Play**
   - The radar dish icon (📡) will appear in your toolbar. Pin it for easy access!

## 📖 Usage Guide

1. **Navigate** to any webpage you want to audit.
2. **Open** the Baseline Radar popup from your toolbar.
3. Click **"Analyze Current Page"**.
4. **Browse** the results:
   - Use the tabs to filter by **CSS**, **JS**, or **HTML**.
   - Hover over or click items to see detailed browser support versions.
   - Check the summary dots for a quick health check of the page.

## ⚙️ How It Works

Baseline Radar performs real-time static analysis on the client side:

1. **Data Sync**: Fetches the latest `web-features` dataset from the Open Web Platform DX project.
2. **Extraction**:
   - **DOM Traversal**: Identifies HTML tags and attributes.
   - **Style Parsing**: Reads `document.styleSheets` and computed styles.
   - **Script Analysis**: Scans for specific API keywords and constructors.
3. **Matching**: Cross-references findings with the localized Baseline database.

## 🤝 Contributing

We welcome contributions! Whether it's adding better feature detection, improving the UI, or fixing bugs.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <small>Powered by <a href="https://github.com/web-platform-dx/web-features">web-features</a> data.</small>
</div>
