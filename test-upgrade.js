const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

// Use the SAME 35-char secret the server is using (the default)
const JWT_SECRET = "dev-secret-key-change-in-production";

const token = jwt.sign(
  {
    userId: 3,
    email: "Ted_Lem@outlook.com",
    name: "Tod Lin"
  },
  JWT_SECRET,
  { expiresIn: "1h", algorithm: "HS256" }
);

console.log("✅ JWT Token created with correct secret");
console.log("Token preview:", token.substring(0, 50) + "...");

fetch("http://localhost:3000/api/billing/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ plan: "growth_annual" })
})
.then(r => r.json())
.then(data => {
  console.log("\n=== CHECKOUT RESPONSE ===");
  console.log(JSON.stringify(data, null, 2));
  if (data.url) {
    console.log("\n✅ SUCCESS: Stripe Checkout URL returned!");
    console.log("URL:", data.url.substring(0, 80) + "...");
  } else if (data.error) {
    console.log("\n❌ ERROR:", data.error);
  }
})
.catch(err => console.error("Request failed:", err));
