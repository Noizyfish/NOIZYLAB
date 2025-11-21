// godaddy-dns-manager.js
// Run with: node godaddy-dns-manager.js

import fetch from "node-fetch";

const API_KEY = "YOUR_GODADDY_API_KEY";
const API_SECRET = "YOUR_GODADDY_API_SECRET";

const DOMAIN = "noizylab.ca";

// ----------------------------
// Helper for GoDaddy API calls
// ----------------------------
async function api(path, method = "GET", body = null) {
  const url = `https://api.godaddy.com/v1/domains/${DOMAIN}${path}`;

  const headers = {
    "Authorization": `sso-key ${API_KEY}:${API_SECRET}`,
    "Content-Type": "application/json"
  };

  const options = { method, headers };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    const details = await response.text();
    console.error(details);
    throw new Error("GoDaddy API failed.");
  }

  return response.json().catch(() => ({}));
}

// ----------------------------
// Set domain forwarding
// ----------------------------
async function setForwarding() {
  console.log("🔁 Setting forwarding for noizyfish.com → noizylab.ca");

  const forwarding = {
    "forwarding": {
      "domain": "noizylab.ca",
      "type": "REDIRECT_PERMANENT",
      "protocol": "https"
    }
  };

  return api(`/records/forwarding`, "PUT", forwarding);
}

// ----------------------------
// Configure email DNS records
// ----------------------------
async function setEmailDNS() {
  console.log("📨 Adding MX, SPF, and DKIM placeholders…");

  const records = [
    {
      type: "MX",
      name: "@",
      data: "mail.noizylab.ca",
      priority: 10,
      ttl: 600
    },
    {
      type: "TXT",
      name: "@",
      data: "v=spf1 include:noizylab.ca ~all",
      ttl: 600
    },
    {
      type: "TXT",
      name: "selector1._domainkey",
      data: "DKIM_PLACEHOLDER_VALUE",
      ttl: 600
    }
  ];

  return api(`/records`, "PUT", records);
}

// ----------------------------
// EXECUTE ALL TASKS
// ----------------------------
async function run() {
  try {
    console.log("🚀 Starting GoDaddy automation…");

    await setForwarding();
    console.log("✅ Forwarding updated");

    await setEmailDNS();
    console.log("✅ DNS email records updated");

    console.log("🎉 All tasks completed successfully!");
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

run();
