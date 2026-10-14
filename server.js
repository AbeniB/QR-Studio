const express = require("express");
const path = require("path");
const qr = require("qr-image");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeWifi(value) {
  // Escape characters reserved by the Wi-Fi QR format.
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function makePayload(body) {
  const type = clean(body.type) || "url";

  if (type === "url") {
    let value = clean(body.url);
    if (!value) throw new Error("Enter a website URL.");

    if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
      value = `https://${value}`;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("Enter a valid URL, such as example.com.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Website URLs must start with http:// or https://.");
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      throw new Error("Enter a complete domain, such as example.com.");
    }
    return value;
  }

  if (type === "text") {
    const value = clean(body.text);
    if (!value) throw new Error("Enter some text to put in the QR code.");
    if (value.length > 2500) throw new Error("Text is too long. Please use 2,500 characters or fewer.");
    return value;
  }

  if (type === "wifi") {
    const ssid = clean(body.ssid);
    const password = typeof body.password === "string" ? body.password : "";
    const security = clean(body.security) || "WPA";
    if (!ssid) throw new Error("Enter the Wi-Fi network name (SSID).");
    if (!["WPA", "WEP", "nopass"].includes(security)) throw new Error("Choose a valid Wi-Fi security type.");
    if (security !== "nopass" && !password) throw new Error("Enter the Wi-Fi password, or choose an open network.");
    return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;
  }

  if (type === "phone") {
    const phone = clean(body.phone);
    if (!phone) throw new Error("Enter a phone number.");
    if (!/^[+\d()\s.-]{5,25}$/.test(phone)) throw new Error("Enter a valid phone number.");
    return `tel:${phone.replace(/[()\s.-]/g, "")}`;
  }

  if (type === "email") {
    const email = clean(body.email);
    const subject = clean(body.subject);
    const message = clean(body.message);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (message) params.set("body", message);
    const query = params.toString();
    return `mailto:${email}${query ? `?${query}` : ""}`;
  }

  if (type === "vcard") {
    const name = clean(body.name);
    const phone = clean(body.contactPhone);
    const email = clean(body.contactEmail);
    const organization = clean(body.organization);
    if (!name) throw new Error("Enter the contact's name.");
    if (!phone && !email) throw new Error("Enter at least a phone number or email address.");
    const safe = (value) => value.replace(/[\r\n]/g, " ").replace(/([,;\\])/g, "\\$1");
    const nameParts = name.split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop() : "";
    const firstName = nameParts.join(" ");
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${safe(lastName)};${safe(firstName)};;;`,
      `FN:${safe(name)}`
    ];
    if (organization) lines.push(`ORG:${safe(organization)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${safe(phone)}`);
    if (email) lines.push(`EMAIL:${safe(email)}`);
    lines.push("END:VCARD");
    return lines.join("\r\n");
  }

  throw new Error("Choose one of the available QR code types.");
}

app.post("/api/qr", (req, res) => {
  try {
    const payload = makePayload(req.body || {});
    const image = qr.image(payload, {
      type: "png",
      ec_level: "H",
      margin: 2
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    image.on("error", () => {
      if (!res.headersSent) res.status(500).json({ error: "Could not generate the QR code. Try shorter text." });
      else res.end();
    });
    image.pipe(res);
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not generate the QR code." });
  }
});

app.listen(PORT, () => {
  console.log(`QR Generator running at http://localhost:${PORT}`);
});
