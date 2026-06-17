const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-nav]");
const screenLinks = document.querySelectorAll("[data-screen-link]");
const segmentedButtons = document.querySelectorAll(".segmented button");
const periodButtons = document.querySelectorAll(".period-tabs button");
const categoryButtons = document.querySelectorAll(".category-chip");
const amountDisplay = document.querySelector("#amount-display");
const keypad = document.querySelector(".keypad");
const captureTabs = document.querySelectorAll("[data-capture-tab]");
const capturePanels = document.querySelectorAll("[data-capture-panel]");
const scanButton = document.querySelector("[data-scan-action]");
const scannerCard = document.querySelector(".scanner-card");
const scanStatus = document.querySelector("#scan-status");
const ocrConfidence = document.querySelector("#ocr-confidence");
const receiptUpload = document.querySelector("#receipt-upload");
const saveReceiptButton = document.querySelector(".save-receipt");
const analyticsTitle = document.querySelector("#analytics-title");
const reportPeriodLabel = document.querySelector("#report-period-label");
const reportNetCashflow = document.querySelector("#report-net-cashflow");
const metricIncome = document.querySelector("#metric-income");
const metricExpense = document.querySelector("#metric-expense");
const metricSaving = document.querySelector("#metric-saving");
const metricBudget = document.querySelector("#metric-budget");
const reportActions = document.querySelectorAll("[data-report-action]");
const reportExportStatus = document.querySelector("#report-export-status");

let activeAmount = "";
const validScreens = new Set(Array.from(screens, (screen) => screen.dataset.screen));
const reportPeriodData = {
  today: {
    title: "Báo cáo hôm nay",
    label: "17/06/2026",
    net: "+420.000 VND",
    income: "1.250.000",
    expense: "830.000",
    saving: "420.000",
    budget: "18%",
  },
  week: {
    title: "Báo cáo tuần này",
    label: "15/06 - 21/06/2026",
    net: "+2.850.000 VND",
    income: "8.500.000",
    expense: "5.650.000",
    saving: "2.850.000",
    budget: "42%",
  },
  month: {
    title: "Báo cáo tháng 10",
    label: "Tháng 10/2026",
    net: "+13.000.000 VND",
    income: "45.000.000",
    expense: "32.000.000",
    saving: "13.000.000",
    budget: "78%",
  },
  quarter: {
    title: "Báo cáo quý IV",
    label: "Quý IV/2026",
    net: "+38.700.000 VND",
    income: "132.000.000",
    expense: "93.300.000",
    saving: "38.700.000",
    budget: "74%",
  },
  year: {
    title: "Báo cáo năm 2026",
    label: "Năm 2026",
    net: "+156.000.000 VND",
    income: "540.000.000",
    expense: "384.000.000",
    saving: "156.000.000",
    budget: "71%",
  },
};

function setActiveScreen(screenName, options = {}) {
  const targetScreen = validScreens.has(screenName) ? screenName : "home";

  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === targetScreen);
    if (screen.dataset.screen === targetScreen) {
      screen.scrollTop = 0;
    }
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === targetScreen);
  });

  if (!options.skipUrlSync) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", targetScreen);
    window.history.replaceState({}, "", url);
  }
}

function formatCurrency(rawValue) {
  const value = Number(rawValue || "0");
  return `${new Intl.NumberFormat("vi-VN").format(value)} VND`;
}

function updateAmountDisplay() {
  amountDisplay.textContent = formatCurrency(activeAmount);
}

function setCapturePanel(panelName) {
  captureTabs.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.captureTab === panelName);
  });

  capturePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.capturePanel === panelName);
  });
}

function simulateReceiptScan(source = "camera") {
  if (!scannerCard || !scanStatus || !ocrConfidence) return;

  scannerCard.classList.remove("is-complete", "is-scanning");
  void scannerCard.offsetWidth;
  scannerCard.classList.add("is-scanning");
  scanStatus.textContent = source === "upload" ? "Đang đọc ảnh" : "Đang quét";
  ocrConfidence.textContent = "Đang xử lý";

  window.setTimeout(() => {
    scannerCard.classList.remove("is-scanning");
    scannerCard.classList.add("is-complete");
    scanStatus.textContent = "Đã nhận diện";
    ocrConfidence.textContent = source === "upload" ? "92% tin cậy" : "96% tin cậy";
  }, 1500);
}

function updateReportPeriod(periodName) {
  const data = reportPeriodData[periodName];
  if (!data) return;

  analyticsTitle.textContent = data.title;
  reportPeriodLabel.textContent = data.label;
  reportNetCashflow.textContent = data.net;
  metricIncome.textContent = data.income;
  metricExpense.textContent = data.expense;
  metricSaving.textContent = data.saving;
  metricBudget.textContent = data.budget;
}

function setReportPeriod(periodName) {
  if (!reportPeriodData[periodName]) return;

  periodButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.period === periodName);
  });
  updateReportPeriod(periodName);
}

function handleReportExport(button) {
  if (!reportExportStatus) return;

  const format = button.textContent.trim() || "Báo cáo";
  reportExportStatus.textContent = `Đang tạo ${format}`;

  window.setTimeout(() => {
    reportExportStatus.textContent = `Đã tạo ${format}`;
  }, 900);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveScreen(button.dataset.nav);
  });
});

screenLinks.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveScreen(button.dataset.screenLink);
  });
});

segmentedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    segmentedButtons.forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
  });
});

periodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setReportPeriod(button.dataset.period);
  });
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});

captureTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setCapturePanel(button.dataset.captureTab);
  });
});

if (scanButton) {
  scanButton.addEventListener("click", () => {
    simulateReceiptScan();
  });
}

if (receiptUpload) {
  receiptUpload.addEventListener("change", () => {
    if (receiptUpload.files.length > 0) {
      simulateReceiptScan("upload");
    }
  });
}

if (saveReceiptButton) {
  saveReceiptButton.addEventListener("click", () => {
    scanStatus.textContent = "Đã lưu";
    saveReceiptButton.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.98)" },
        { transform: "scale(1)" },
      ],
      { duration: 180, easing: "ease-out" },
    );
  });
}

reportActions.forEach((button) => {
  button.addEventListener("click", () => {
    handleReportExport(button);
  });
});

if (keypad) {
  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-key]");
    if (!button) return;

    const key = button.dataset.key;

    if (key === "back") {
      activeAmount = activeAmount.slice(0, -1);
      updateAmountDisplay();
      return;
    }

    if (key === "done") {
      const amount = activeAmount ? formatCurrency(activeAmount) : "0 VND";
      button.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.96)" },
          { transform: "scale(1)" },
        ],
        { duration: 180, easing: "ease-out" },
      );
      amountDisplay.textContent = amount;
      return;
    }

    if (activeAmount.length >= 11) return;

    activeAmount = activeAmount === "0" ? key : `${activeAmount}${key}`;
    activeAmount = activeAmount.replace(/^0+(?=\d)/, "");
    updateAmountDisplay();
  });
}

const initialParams = new URLSearchParams(window.location.search);
const initialScreen = initialParams.get("screen") || window.location.hash.replace("#", "");
const initialCapture = initialParams.get("capture");
const initialPeriod = initialParams.get("period");
const initialScroll = Number(initialParams.get("scroll") || "0");
setActiveScreen(initialScreen || "home", { skipUrlSync: true });
if (initialCapture) setCapturePanel(initialCapture);
if (initialPeriod) setReportPeriod(initialPeriod);
updateAmountDisplay();

if (initialScroll > 0) {
  window.requestAnimationFrame(() => {
    const activeScreen = document.querySelector(".screen.is-active");
    if (activeScreen) {
      activeScreen.scrollTop = initialScroll;
    }
  });
}
