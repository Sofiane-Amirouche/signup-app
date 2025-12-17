const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In‑memory user store (replace with DB later)
const users = [];

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ Test email route
app.get('/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test Email',
      text: 'This is a test email from your signup app.'
    });
    res.send('Test email sent!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending test email');
  }
});

// ✅ Signup route
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const token = Math.random().toString(36).substring(2);

  users.push({
    name,
    email,
    password: hashedPassword,
    confirmed: false,
    confirmationToken: token
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Please confirm your email',
      text: `Click here to confirm: http://localhost:${process.env.PORT}/confirm/${token}`
    });
    res.send('Signup successful! Please check your email to confirm.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending confirmation email');
  }
});

// ✅ Confirm email route
app.get('/confirm/:token', (req, res) => {
  const { token } = req.params;
  const user = users.find(u => u.confirmationToken === token);

  if (!user) {
    return res.status(400).send('Invalid token');
  }

  user.confirmed = true;
  res.send('Email confirmed! You can now log in.');
});

// ✅ Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).send('User not found');
  }
  if (!user.confirmed) {
    return res.status(400).send('Please confirm your email first');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).send('Invalid password');
  }

  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});