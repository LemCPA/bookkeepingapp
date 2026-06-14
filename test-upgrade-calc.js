const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const JWT_SECRET = "dev-secret-key-change-in-production";

const token = jwt.sign(
  {
    userId: 3,
    email: "Ted_Lem@outlook.com",
    name: "Tod Lin"
  },
  JWT_SECRET,
  { expiresIn: "24h", algorithm: "HS256" }
);

console.log("=== Simulating Starter → Growth Upgrade ===\n");

// Calculate upgrade from Starter to Growth
fetch("http://localhost:3000/api/billing/upgrade-preview", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ newPlan: "growth_annual" })
})
.then(r => r.json())
.then(data => {
  console.log("Upgrade Preview Response:");
  console.log(JSON.stringify(data, null, 2));
  
  if (data.netChargeAmount !== undefined) {
    console.log("\n=== UPGRADE CALCULATION ===");
    console.log(`Current Plan: ${data.oldPlan} (${data.oldPlanKey})`);
    console.log(`Current Price: $${data.oldPlanPrice}/year`);
    console.log(`New Plan: ${data.newPlan}`);
    console.log(`New Price: $${data.newPlanPrice}/year`);
    console.log(`Refund for Unused Time: $${data.refundForUnusedTime}`);
    console.log(`NET CHARGE: $${data.netChargeAmount}`);
    console.log(`Days Remaining: ${data.daysRemaining}`);
  }
})
.catch(err => console.error("Error:", err));
