const jwt = require("jsonwebtoken");

const JWT_SECRET = "dev-secret-key-change-in-production";

// Fresh token for user 3
const freshToken = jwt.sign(
  {
    userId: 3,
    email: "Ted_Lem@outlook.com",
    name: "Tod Lin"
  },
  JWT_SECRET,
  { expiresIn: "24h", algorithm: "HS256" }
);

console.log(freshToken);
