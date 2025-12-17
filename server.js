const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let users = [];

// ✅ Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey", // this is literally the string "apikey"
    pass: process.env.SENDGRID_API_KEY
  }
});

// Signup route
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const token = uuidv4();

  users.push({ name, email, password: hashedPassword, confirmed: false, token });

  const confirmUrl = `https://${req.headers.host}/confirm/${token}`;
  const mailOptions = {
    from: process.env.BREVO_USER,
    to: email,
    subject: "Confirm your account",
    text: `Click here to confirm: ${confirmUrl}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Email error:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });

  res.send("Signup successful! Check your email to confirm.");
});

// Confirm route
app.get("/confirm/:token", (req, res) => {
  const user = users.find(u => u.token === req.params.token);
  if (user) {
    user.confirmed = true;
    res.send("Account confirmed! You can now log in.");
  } else {
    res.send("Invalid confirmation link.");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.send("User not found.");
  if (!user.confirmed) return res.send("Please confirm your email first.");

  const match = await bcrypt.compare(password, user.password);
  if (match) {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } else {
    res.send("Invalid password.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));