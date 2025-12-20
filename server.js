const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const session = require("express-session");
const sgMail = require("@sendgrid/mail");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Create users table if not exists
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      confirmed BOOLEAN DEFAULT FALSE,
      resetToken TEXT
    );
  `);
}
initDB();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ✅ SESSION CONFIG
app.use(
  session({
    secret: "supersecretkey123",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
  })
);

// ✅ PROTECT DASHBOARD
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

// ✅ HTML EMAIL TEMPLATES
function confirmationEmailTemplate(email, domain) {
  return `
  <div style="font-family: Arial; padding: 20px;">
    <h2>Welcome!</h2>
    <p>Click the button below to confirm your account:</p>
    <a href="${domain}/confirm?email=${email}"
       style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">
       Confirm Account
    </a>
    <p>If the button doesn't work, use this link:</p>
    <p>${domain}/confirm?email=${email}</p>
  </div>
  `;
}

function resetEmailTemplate(token, domain) {
  return `
  <div style="font-family: Arial; padding: 20px;">
    <h2>Password Reset</h2>
    <p>Click the button below to reset your password:</p>
    <a href="${domain}/reset-password.html?token=${token}"
       style="display:inline-block;padding:10px 20px;background:#dc3545;color:white;text-decoration:none;border-radius:5px;">
       Reset Password
    </a>
    <p>If the button doesn't work, use this link:</p>
    <p>${domain}/reset-password.html?token=${token}</p>
  </div>
  `;
}

// ✅ SIGNUP
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (email, password, confirmed) VALUES ($1, $2, false)",
      [email, hashedPassword]
    );

    const domain = process.env.DOMAIN_URL;

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM,
      subject: "Confirm your account",
      html: confirmationEmailTemplate(email, domain)
    };

    await sgMail.send(msg);
    res.send("✅ Signup successful! Check your email to confirm.");
  } catch (err) {
    res.send("❌ Signup failed: " + err.message);
  }
});

// ✅ CONFIRM EMAIL
app.get("/confirm", async (req, res) => {
  const { email } = req.query;

  const result = await pool.query(
    "UPDATE users SET confirmed = true WHERE email = $1",
    [email]
  );

  if (result.rowCount === 0) return res.send("❌ Confirmation failed");

  res.send(`✅ Account confirmed for ${email}`);
});

// ✅ LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email
  ]);

  if (result.rowCount === 0) return res.send("❌ User not found");

  const user = result.rows[0];

  if (!user.confirmed) return res.send("❌ Please confirm your email first");

  if (!bcrypt.compareSync(password, user.password))
    return res.send("❌ Incorrect password");

  req.session.user = { email: user.email };
  res.redirect("/dashboard");
});

// ✅ DASHBOARD
app.get("/dashboard", requireLogin, (req, res) => {
  res.send(`
    <html>
      <head><link rel="stylesheet" href="style.css"></head>
      <body>
        <div class="container">
          <h1>Welcome, ${req.session.user.email}</h1>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </body>
    </html>
  `);
});

// ✅ SESSION INFO
app.get("/session-info", (req, res) => {
  if (!req.session.user) return res.json({ email: "Unknown" });
  res.json({ email: req.session.user.email });
});

// ✅ FORGOT PASSWORD
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(32).toString("hex");

  const result = await pool.query(
    "UPDATE users SET resetToken = $1 WHERE email = $2",
    [token, email]
  );

  if (result.rowCount === 0) return res.send("❌ Email not found");

  const domain = process.env.DOMAIN_URL;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM,
    subject: "Password Reset",
    html: resetEmailTemplate(token, domain)
  };

  await sgMail.send(msg);
  res.send("✅ Reset email sent");
});

// ✅ RESET PASSWORD
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await pool.query(
    "SELECT email FROM users WHERE resetToken = $1",
    [token]
  );

  if (result.rowCount === 0) return res.send("❌ Invalid or expired token");

  const email = result.rows[0].email;
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  await pool.query(
    "UPDATE users SET password = $1, resetToken = NULL WHERE email = $2",
    [hashedPassword, email]
  );

  res.send("✅ Password reset successful");
});

// ✅ LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ✅ START SERVER
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});