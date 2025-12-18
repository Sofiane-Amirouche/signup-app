const express = require("express");
const bodyParser = require("body-parser");
const sgMail = require("@sendgrid/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (HTML + CSS)
app.use(express.static("public"));

// Set SendGrid API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  // Normally you'd save user to a database here

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
    res.status(500).send("Error sending confirmation email");
  }
});

// Login route (placeholder)
app.post("/login", (req, res) => {
  res.send("Login route not yet implemented.");
});

// Forgot password route (placeholder)
app.post("/forgot-password", (req, res) => {
  res.send("Password reset route not yet implemented.");
});

// Confirmation route
app.get("/confirm", (req, res) => {
  const { email } = req.query;
  res.send(`✅ Account confirmed for ${email}! You can now log in.`);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));