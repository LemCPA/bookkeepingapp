const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const JWT_SECRET = "dev-secret-key-change-in-production";

// Create token for user 3
const token = jwt.sign(
  {
    userId: 3,
    email: "Ted_Lem@outlook.com",
    name: "Tod Lin"
  },
  JWT_SECRET,
  { expiresIn: "24h", algorithm: "HS256" }
);

console.log("=== Step 1: Subscribe to STARTER (Annual) ===");

// First subscribe to Starter
fetch("http://localhost:3000/api/billing/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ plan: "starter_annual" })
})
.then(r => r.json())
.then(data => {
  console.log("Starter checkout response:", data.url ? "✅ Got URL" : "❌ Error: " + data.error);
  if (data.url) {
    console.log("Checkout URL (first 100 chars):", data.url.substring(0, 100));
  }
})
.catch(err => console.error("Error:", err));
