const express = require("express");
const bodyParser = require("body-parser");
const sgMail = require("@sendgrid/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ Set SendGrid API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Welcome to the signup app! Use /signup to create an account.");
});

// ✅ Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const confirmUrl = `https://signup-app-1-c6qs.onrender.com/confirm?email=${email}`;

  const msg = {
    to: email,
    from: "sofiane.amiro@gmail.com", // must match verified sender in SendGrid
    subject: "Confirm your account",
    text: `Click here to confirm your account: ${confirmUrl}`
  };

  console.log("Sending confirmation to:", email);

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully");
    res.send("Signup successful! Check your email to confirm.");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending confirmation email");
  }
});

// ✅ Confirmation route
app.get("/confirm", (req, res) => {
  const { email } = req.query;
  res.send(`Account confirmed for ${email}!`);
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});