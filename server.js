const express = require("express");
const bodyParser = require("body-parser");
const sgMail = require("@sendgrid/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ Set your SendGrid API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  // Normally you’d save the user to a database here

  const confirmUrl = `https://signup-app-1-c6qs.onrender.com/confirm?email=${email}`;

  const msg = {
    to: email, // the signup email address
    from: "sofiane.amiro@gmail.com", // must match your verified sender in SendGrid
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});