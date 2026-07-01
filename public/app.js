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
const cameraToggleButton = document.querySelector("[data-camera-toggle]");
const receiptCamera = document.querySelector("#receipt-camera");
const receiptCanvas = document.querySelector("#receipt-canvas");
const ocrMerchant = document.querySelector("#ocr-merchant");
const ocrTotal = document.querySelector("#ocr-total");
const ocrVat = document.querySelector("#ocr-vat");
const ocrCategory = document.querySelector("#ocr-category");
const ocrItems = document.querySelector("#ocr-items");
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
const chatThread = document.querySelector("#chat-thread");
const chatForm = document.querySelector("[data-chat-form]");
const chatInput = document.querySelector("#chat-input");
const chatProvider = document.querySelector("#chat-provider");
const chatClearButton = document.querySelector("[data-chat-clear]");
const chatPromptButtons = document.querySelectorAll("[data-chat-prompt]");

let activeAmount = "";
let cameraStream = null;
let lastReceiptId = null;
let chatHistory = [];
const validScreens = new Set(Array.from(screens, (screen) => screen.dataset.screen));
const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const localStaticPorts = new Set(["5173", "5500", "8080"]);
const localApiBase = "http://localhost:8000";
const API_BASE =
  window.location.protocol === "file:" || (isLocalHost && localStaticPorts.has(window.location.port))
    ? localApiBase
    : window.location.origin;
const maxClientUploadBytes = 3800000;
const demoOcrResult = {
  merchant: "Co.op Food Nguyễn Trãi",
  totalAmount: 287000,
  vatAmount: 21273,
  categoryName: "Ăn uống",
  confidence: 0.94,
  items: [
    { name: "Gạo ST25 5kg", amount: 128000 },
    { name: "Sữa tươi không đường", amount: 84000 },
    { name: "Rau củ & gia vị", amount: 53000 },
    { name: "VAT 8%", amount: 21273 },
  ],
};
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

  if (targetScreen !== "add") {
    stopReceiptCamera();
  }

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

function formatVnd(rawValue, options = {}) {
  const value = Number(rawValue || 0);
  const formatted = new Intl.NumberFormat("vi-VN").format(value);
  return options.withUnit === false ? formatted : `${formatted} VND`;
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

  if (panelName !== "scan") {
    stopReceiptCamera();
  }
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
    applyOcrResult({
      ...demoOcrResult,
      confidence: source === "upload" ? 0.92 : 0.96,
    });
  }, 1500);
}

function setScanState(status, confidence = "Đang xử lý") {
  if (scanStatus) scanStatus.textContent = status;
  if (ocrConfidence) ocrConfidence.textContent = confidence;
}

function renderOcrItems(items = demoOcrResult.items) {
  if (!ocrItems) return;

  ocrItems.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    const amount = document.createElement("b");

    name.textContent = item.name || "Dòng hóa đơn";
    amount.textContent = formatVnd(item.amount, { withUnit: false });
    row.append(name, amount);
    ocrItems.append(row);
  });
}

function applyOcrResult(result = demoOcrResult) {
  const confidenceValue = Number(result.confidence || demoOcrResult.confidence);
  const confidencePercent = confidenceValue <= 1 ? Math.round(confidenceValue * 100) : Math.round(confidenceValue);

  if (ocrMerchant) ocrMerchant.textContent = result.merchant || demoOcrResult.merchant;
  if (ocrTotal) ocrTotal.textContent = formatVnd(result.totalAmount || demoOcrResult.totalAmount);
  if (ocrVat) ocrVat.textContent = formatVnd(result.vatAmount || 0);
  if (ocrCategory) ocrCategory.textContent = result.categoryName || "Ăn uống";
  if (ocrConfidence) ocrConfidence.textContent = `${confidencePercent}% tin cậy`;
  renderOcrItems(result.items);
}

function stopReceiptCamera() {
  if (!cameraStream) return;

  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  if (receiptCamera) receiptCamera.srcObject = null;
  if (scannerCard) scannerCard.classList.remove("has-camera");
  if (cameraToggleButton) cameraToggleButton.setAttribute("aria-label", "Mở camera");
  if (scanStatus?.textContent === "Camera đang bật") {
    scanStatus.textContent = "Sẵn sàng";
  }
}

async function waitForVideoFrame() {
  if (!receiptCamera) throw new Error("Không tìm thấy khung camera");
  if (receiptCamera.videoWidth > 0 && receiptCamera.videoHeight > 0) return;

  await new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Camera chưa trả hình ảnh")), 5000);
    receiptCamera.addEventListener(
      "loadedmetadata",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function startReceiptCamera() {
  if (!receiptCamera || !scannerCard) return false;
  if (cameraStream) return true;

  if (!navigator.mediaDevices?.getUserMedia) {
    setScanState("Cần HTTPS để mở camera", "Chưa hỗ trợ");
    return false;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    receiptCamera.srcObject = cameraStream;
    await receiptCamera.play();
    scannerCard.classList.add("has-camera");
    if (cameraToggleButton) cameraToggleButton.setAttribute("aria-label", "Tắt camera");
    setScanState("Camera đang bật", "Sẵn sàng chụp");
    return true;
  } catch (error) {
    console.warn("[camera] cannot start:", error);
    setScanState("Không mở được camera", "Kiểm tra quyền");
    return false;
  }
}

async function captureCameraBlob() {
  if (!receiptCamera || !receiptCanvas) throw new Error("Thiếu camera hoặc canvas");
  await waitForVideoFrame();

  const width = receiptCamera.videoWidth || 1280;
  const height = receiptCamera.videoHeight || 720;
  receiptCanvas.width = width;
  receiptCanvas.height = height;

  const context = receiptCanvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo canvas");
  context.drawImage(receiptCamera, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    receiptCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không chụp được ảnh hóa đơn"));
      },
      "image/jpeg",
      0.86,
    );
  });
}

async function downsizeImageBlob(file) {
  if (!file.type.startsWith("image/") || file.size <= maxClientUploadBytes) {
    return { blob: file, fileName: file.name || `receipt-upload-${Date.now()}.jpg` };
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể nén ảnh hóa đơn");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (output) resolve(output);
        else reject(new Error("Không thể tạo ảnh nén"));
      },
      "image/jpeg",
      0.78,
    );
  });

  return {
    blob,
    fileName: file.name.replace(/\.[^.]+$/, "") + "-vercel.jpg",
  };
}

function normalizeOcrPayload(payload) {
  const receipt = payload?.receipt || {};
  const ocr = payload?.ocr || {};
  return {
    merchant: ocr.merchant || receipt.merchant || demoOcrResult.merchant,
    totalAmount: ocr.totalAmount || receipt.totalAmount || demoOcrResult.totalAmount,
    vatAmount: ocr.vatAmount || receipt.vatAmount || 0,
    categoryName: ocr.categoryName || "Ăn uống",
    confidence: ocr.confidence || receipt.confidence || demoOcrResult.confidence,
    items: payload?.items || ocr.items || demoOcrResult.items,
  };
}

function markScanComplete(payload) {
  lastReceiptId = payload?.receipt?.id || lastReceiptId;
  applyOcrResult(normalizeOcrPayload(payload));
  scannerCard.classList.remove("is-scanning");
  scannerCard.classList.add("is-complete");
  scanStatus.textContent = "Đã nhận diện";
}

async function scanReceiptInOneRequest(blob, fileName) {
  const formData = new FormData();
  formData.append("file", blob, fileName);

  setScanState("Đang đọc hóa đơn", "FastAPI OCR");
  const response = await fetch(`${API_BASE}/api/receipts/scan`, {
    method: "POST",
    body: formData,
  });

  if (response.status === 404 || response.status === 405) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`Scan thất bại: ${response.status}`);
  }

  const payload = await response.json();
  markScanComplete(payload);
  return true;
}

async function uploadReceiptBlob(blob, fileName = "receipt-camera.jpg") {
  if (!scannerCard) return;

  scannerCard.classList.remove("is-complete");
  scannerCard.classList.add("is-scanning");
  setScanState("Đang tải ảnh", "Đang xử lý");

  const scanned = await scanReceiptInOneRequest(blob, fileName);
  if (scanned) return;

  const formData = new FormData();
  formData.append("file", blob, fileName);

  const uploadResponse = await fetch(`${API_BASE}/api/receipts/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload thất bại: ${uploadResponse.status}`);
  }

  const uploadPayload = await uploadResponse.json();
  const receiptId = uploadPayload?.receipt?.id;
  if (!receiptId) throw new Error("API không trả receipt id");
  lastReceiptId = receiptId;

  setScanState("Đang đọc hóa đơn", "Gemini OCR");
  const ocrResponse = await fetch(`${API_BASE}/api/receipts/${receiptId}/ocr`, {
    method: "POST",
  });

  if (!ocrResponse.ok) {
    throw new Error(`OCR thất bại: ${ocrResponse.status}`);
  }

  const ocrPayload = await ocrResponse.json();
  markScanComplete(ocrPayload);
}

async function scanReceiptFromCamera() {
  if (!cameraStream) {
    const started = await startReceiptCamera();
    if (started) setScanState("Căn hóa đơn rồi bấm lại", "Camera sẵn sàng");
    return;
  }

  try {
    const imageBlob = await captureCameraBlob();
    await uploadReceiptBlob(imageBlob, `receipt-camera-${Date.now()}.jpg`);
  } catch (error) {
    console.warn("[receipt scan] using demo fallback:", error);
    simulateReceiptScan("camera");
  }
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

function scrollChatToBottom() {
  if (!chatThread) return;
  chatThread.scrollTop = chatThread.scrollHeight;
}

function appendChatMessage(role, content, options = {}) {
  if (!chatThread) return null;

  const message = document.createElement("article");
  const avatar = document.createElement("span");
  const body = document.createElement("div");
  const author = document.createElement("strong");
  const text = document.createElement("p");

  const isUser = role === "user";
  message.className = `chat-message ${isUser ? "user-message" : "assistant-message"}`;
  if (options.pending) message.classList.add("is-pending");
  avatar.className = "chat-avatar";
  avatar.textContent = isUser ? "Tôi" : "AI";
  author.textContent = isUser ? "Khánh" : "MyMoney AI";
  text.textContent = content;

  body.append(author, text);
  message.append(avatar, body);
  chatThread.append(message);
  scrollChatToBottom();
  return message;
}

function resetChat() {
  chatHistory = [];
  if (!chatThread) return;
  chatThread.replaceChildren();
  appendChatMessage("assistant", "Dòng tiền tháng này đang dương 13.000.000 VND. Ăn uống đã dùng 82% ngân sách.");
  if (chatProvider) chatProvider.textContent = "Sẵn sàng";
}

function setChatBusy(isBusy) {
  if (chatInput) chatInput.disabled = isBusy;
  if (chatForm) {
    const submitButton = chatForm.querySelector("button");
    if (submitButton) submitButton.disabled = isBusy;
  }
}

async function sendChatMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || !chatThread) return;

  setActiveScreen("assistant");
  appendChatMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  setChatBusy(true);
  if (chatProvider) chatProvider.textContent = "Đang trả lời";
  const pendingMessage = appendChatMessage("assistant", "Đang phân tích dữ liệu MyMoney...", { pending: true });

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: chatHistory.slice(-8),
      }),
    });

    if (!response.ok) throw new Error(`Chat failed with ${response.status}`);
    const payload = await response.json();
    const reply = payload.reply || "Tôi chưa có đủ dữ liệu để trả lời câu này.";
    pendingMessage?.remove();
    appendChatMessage("assistant", reply);
    chatHistory.push({ role: "assistant", content: reply });
    if (chatProvider) chatProvider.textContent = `${payload.provider || "mock"} · ${payload.model || "Gemini"}`;
  } catch (error) {
    console.warn("[chat] using local fallback:", error);
    pendingMessage?.remove();
    const fallback = "Dòng tiền tháng này vẫn dương 13.000.000 VND. Trọng tâm hiện tại là giảm ăn uống và giữ hóa đơn có VAT.";
    appendChatMessage("assistant", fallback);
    chatHistory.push({ role: "assistant", content: fallback });
    if (chatProvider) chatProvider.textContent = "mock";
  } finally {
    setChatBusy(false);
    if (chatInput) {
      chatInput.value = "";
      chatInput.focus();
    }
  }
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
  scanButton.addEventListener("click", async () => {
    await scanReceiptFromCamera();
  });
}

if (receiptUpload) {
  receiptUpload.addEventListener("change", async () => {
    const file = receiptUpload.files?.[0];
    if (file) {
      try {
        const prepared = await downsizeImageBlob(file);
        await uploadReceiptBlob(prepared.blob, prepared.fileName);
      } catch (error) {
        console.warn("[receipt upload] using demo fallback:", error);
        simulateReceiptScan("upload");
      } finally {
        receiptUpload.value = "";
      }
    }
  });
}

if (cameraToggleButton) {
  cameraToggleButton.addEventListener("click", async () => {
    if (cameraStream) {
      stopReceiptCamera();
      return;
    }
    await startReceiptCamera();
  });
}

if (saveReceiptButton) {
  saveReceiptButton.addEventListener("click", async () => {
    if (lastReceiptId) {
      try {
        setScanState("Đang lưu giao dịch", ocrConfidence?.textContent || "Đã nhận diện");
        const response = await fetch(`${API_BASE}/api/receipts/${lastReceiptId}/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            note: "Giao dịch tạo từ hóa đơn quét bằng camera",
          }),
        });
        if (!response.ok) throw new Error(`Confirm thất bại: ${response.status}`);
      } catch (error) {
        console.warn("[receipt confirm] local visual fallback:", error);
      }
    }

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

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage(chatInput?.value || "");
  });
}

chatPromptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendChatMessage(button.dataset.chatPrompt || button.textContent || "");
  });
});

if (chatClearButton) {
  chatClearButton.addEventListener("click", () => {
    resetChat();
  });
}

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

window.addEventListener("pagehide", stopReceiptCamera);
