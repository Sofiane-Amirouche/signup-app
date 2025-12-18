const express = require("express");
const bodyParser = require("body-parser");
const sgMail = require("@sendgrid/mail");
const bcrypt = require("bcrypt"); // for password hashing

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Temporary in-memory user store
const users = [];

// Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  // Hash password before storing
  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ email, password: hashedPassword, confirmed: false });

  const confirmUrl = `https://signup-app-1-c6qs.onrender.com/confirm?email=${encodeURIComponent(email)}`;

  const msg = {
    to: email,
    from: "sofiane.amiro@gmail.com",
    subject: "Confirm your account",
    html: `<p>Click here to confirm your account:</p><a href="${confirmUrl}">${confirmUrl}</a>`
  };

  try {
    await sgMail.send(msg);
    res.send("Signup successful! Check your email to confirm.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending confirmation email");
  }
});

// Confirmation route
app.get("/confirm", (req, res) => {
  const { email } = req.query;
  const user = users.find(u => u.email === email);
  if (user) {
    user.confirmed = true;
    res.send(`✅ Account confirmed for ${email}! You can now log in.`);
  } else {
    res.send("User not found.");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

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

// Forgot password route (placeholder)
app.post("/forgot-password", (req, res) => {
  res.send("Password reset route not yet implemented.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));