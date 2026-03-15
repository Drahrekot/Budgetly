<div align="center">
  <img src="https://raw.githubusercontent.com/Drahrekot/Budgetly/refs/heads/main/logo.svg" alt="Budgetly Logo" width="80" />

  # 💸 Budgetly

  **Premium, Minimalist Finance Tracking.**  
  A high-performance budget tracking engine designed for extreme speed and precision.

  [Demo](https://drahrekot.github.io/Budgetly/) • [Report Bug](https://github.com/Drahrekot/Budgetly/issues)
</div>

---

## 🚀 Key Features

*   **🏦 Direct PDF Importer**: Industry-first in-browser PDF parsing for bank statements.
*   **🖱️ GPU-Accelerated Cursor**: Zero-lag interaction system with context-aware "Lens" effects.
*   **🎬 Cinematic Animation**: Orchestrated staggered load-in sequence at 60FPS.
*   **📱 Mobile-First Native**: Optimized rendering paths for touch devices.

---

## 🏦 How to Import Statements

Budgetly supports direct PDF/TXT imports from major financial apps. Follow these steps to sync your transactions:

### 📱 Google Pay (PDF/Manual)
1.  **Open Google Pay**: Go to your Profile (top right).
2.  **Transaction History**: Tap on `Settings` > `Privacy & security` > `Data & personalization`.
3.  **Download Info**: Select `Google Takeout` or `Download Transaction History`.
4.  **Format**: Choose **PDF** (the preferred format).
5.  **Import**: In Budgetly, click the **Import (↑)** button and select your Google Pay PDF.
    *   *Note: Budgetly automatically detects GPay format and handles squashed text logs.*

### 🏢 HDFC Bank (NetBanking)
1.  **Login**: Access HDFC NetBanking on your PC or Mobile.
2.  **Accounts**: Go to `Enquire` > `Account Details` > `View Statement`.
3.  **Period**: Select your desired date range.
4.  **Export**: Scroll to the bottom and select **"Text Delimited"** or **"PDF"**.
5.  **Import**: Click the **Import (↑)** button in Budgetly.
    *   *Tip: Use the Text format for the fastest processing of large multi-year histories.*

### 💾 Backup & Restore (JSON)
1.  **Export**: Click the **Export (↓)** icon to save your entire Budgetly history as a `.json` file.
2.  **Restore**: Use the **Import (↑)** icon and select your `.json` backup to move your data between devices.

---

## ⚡ Performance Optimization

Budgetly is built for "Crazy Fast" responsiveness:
*   **Read-Mutation Layering**: Scripts are designed to avoid Layout Thrashing by separating DOM reads from style writes.
*   **Layer Hints**: Uses `will-change: transform` and `translate3d` to keep calculations on the GPU.
*   **Variable Injection**: Modern CSS Variable system allows for style updates without re-calculating the entire page tree.

---

## 🛠️ Built With

*   **Logic**: Vanilla JavaScript (ES6+)
*   **Design**: Modern CSS (Flexbox/Grid/Backdrop Filters)
*   **Charts**: Chart.js 4.0
*   **PDF Engine**: PDF.js (Mozilla)
*   **Animations**: Custom Cubic-Bezier Curves

---

<div align="center">
  MADE WITH ❤️ FOR BETTER FINANCES
</div>