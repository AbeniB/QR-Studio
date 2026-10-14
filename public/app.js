(() => {
  const form = document.getElementById("qrForm");
  const tabs = [...document.querySelectorAll(".type-tab")];
  const fieldGroups = [...document.querySelectorAll(".fields")];
  const security = document.getElementById("security");
  const passwordWrap = document.getElementById("wifiPasswordWrap");
  const generateButton = document.getElementById("generateButton");
  const resetButton = document.getElementById("resetButton");
  const statusMessage = document.getElementById("statusMessage");
  const qrImage = document.getElementById("qrImage");
  const emptyState = document.getElementById("emptyState");
  const downloadButton = document.getElementById("downloadButton");
  const previewStatus = document.getElementById("previewStatus");
  const previewCaption = document.getElementById("previewCaption");

  let activeType = "url";
  let currentObjectUrl = null;

  function setType(type) {
    activeType = type;
    tabs.forEach((tab) => {
      const selected = tab.dataset.type === type;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    fieldGroups.forEach((group) => {
      const active = group.dataset.fields === type;
      group.hidden = !active;
      group.classList.toggle("active", active);
      group.querySelectorAll("input, textarea, select, button").forEach((control) => {
        control.disabled = !active;
      });
    });
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
  }

  function updateWifiFields() {
    const openNetwork = security.value === "nopass";
    passwordWrap.hidden = openNetwork;
    document.getElementById("password").required = !openNetwork;
  }

  function getPayload() {
    const data = new FormData(form);
    const payload = { type: activeType };
    for (const [key, value] of data.entries()) payload[key] = value;
    return payload;
  }

  function setError(message) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message error";
    previewStatus.textContent = "Needs attention";
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setType(tab.dataset.type)));
  security.addEventListener("change", updateWifiFields);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusMessage.textContent = "";
    statusMessage.className = "status-message";

    if (!form.reportValidity()) return;

    generateButton.disabled = true;
    generateButton.innerHTML = '<span class="spinner" aria-hidden="true"></span> Generating...';
    previewStatus.textContent = "Generating";
    try {
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload())
      });

      if (!response.ok) {
        let message = "Could not generate the QR code. Please check your input.";
        try {
          const errorData = await response.json();
          if (errorData.error) message = errorData.error;
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob.type.includes("image/png")) throw new Error("The server returned an unexpected result. Please try again.");

      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(blob);
      qrImage.src = currentObjectUrl;
      qrImage.hidden = false;
      emptyState.hidden = true;
      downloadButton.href = currentObjectUrl;
      downloadButton.setAttribute("aria-disabled", "false");
      downloadButton.classList.remove("disabled");
      previewStatus.textContent = "Ready to download";
      previewCaption.textContent = `${activeTypeLabel(activeType)} QR code generated. Scan it with your phone to test it.`;
      statusMessage.textContent = "QR code generated successfully.";
      statusMessage.className = "status-message success";
    } catch (error) {
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      generateButton.disabled = false;
      generateButton.innerHTML = '<span aria-hidden="true">▦</span> Generate QR code';
    }
  });

  function activeTypeLabel(type) {
    return ({ url: "Website", text: "Text", wifi: "Wi-Fi", phone: "Phone", email: "Email", vcard: "Contact" })[type] || "Your";
  }

  resetButton.addEventListener("click", () => {
    form.reset();
    setType("url");
    updateWifiFields();
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    qrImage.removeAttribute("src");
    qrImage.hidden = true;
    emptyState.hidden = false;
    downloadButton.href = "#";
    downloadButton.setAttribute("aria-disabled", "true");
    downloadButton.classList.add("disabled");
    previewStatus.textContent = "Waiting for input";
    previewCaption.textContent = "Your generated code will be shown here.";
  });

  downloadButton.addEventListener("click", (event) => {
    if (downloadButton.getAttribute("aria-disabled") === "true") event.preventDefault();
  });

  updateWifiFields();
})();
