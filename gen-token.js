const jwt = require("jsonwebtoken");

// Use the EXACT 35-char secret the server is using
const JWT_SECRET = "dev-secret-key-change-in-production";

// Create new token with proper expiration (24 hours from now)
const token = jwt.sign(
  {
    userId: 3,
    email: "Ted_Lem@outlook.com",
    name: "Tod Lin"
  },
  JWT_SECRET,
  { 
    expiresIn: "24h",
    algorithm: "HS256" 
  }
);

console.log(token);
