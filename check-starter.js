const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

// Use the correct 35-char secret
const JWT_SECRET = "dev-secret-key-change-in-production";

// Create token for user on Starter plan
const token = jwt.sign(
  {
    userId: 2,
    email: "ted@lemcpa.ca",
    name: "Ted Lem"
  },
  JWT_SECRET,
  { expiresIn: "24h", algorithm: "HS256" }
);

console.log("✅ Created JWT for user 2 (ted@lemcpa.ca)");
console.log("Token:", token);

// Check if user has subscription
fetch("http://localhost:3000/api/billing/subscription", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log("\n=== Current Subscription ===");
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error("Error:", err));
