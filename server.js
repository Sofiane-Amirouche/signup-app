const express = require("express");
const bodyParser = require("body-parser");
const sgMail = require("@sendgrid/mail");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (index.html + style.css)
app.use(express.static("public"));

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// SQLite database setup
const db = new sqlite3.Database("./users.db");

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT,
    confirmed INTEGER
  )
`);

// Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user into DB with confirmed=0
  db.run(
    "INSERT OR REPLACE INTO users (email, password, confirmed) VALUES (?, ?, ?)",
    [email, hashedPassword, 0],
    async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error saving user.");
      }

      const confirmUrl = `https://signup-app-1-c6qs.onrender.com/confirm?email=${encodeURIComponent(email)}`;

      const msg = {
        to: email,
        from: "sofiane.amiro@gmail.com", // must match verified sender in SendGrid
        subject: "Confirm your account",
        html: `<p>Click here to confirm your account:</p><a href="${confirmUrl}">${confirmUrl}</a>`
      };

      try {
        await sgMail.send(msg);
        console.log("Email sent successfully to:", email);
        res.send("Signup successful! Check your email to confirm.");
      } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Error sending confirmation email.");
      }
    }
  );
});

// Confirmation route
app.get("/confirm", (req, res) => {
  const { email } = req.query;
  db.run("UPDATE users SET confirmed = 1 WHERE email = ?", [email], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error confirming account.");
    }
    res.send(`✅ Account confirmed for ${email}! You can now log in.`);
  });
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching user.");
    }
    if (!user) {
      return res.status(400).send("User not found.");
    }
    if (!user.confirmed) {
      return res.status(400).send("Please confirm your email before logging in.");
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      res.send(`✅ Login successful! Welcome back, ${email}.`);
    } else {
      res.status(400).send("Invalid password.");
    }
  });
});

// Forgot password route (placeholder)
app.post("/forgot-password", (req, res) => {
  res.send("Password reset route not yet implemented.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));