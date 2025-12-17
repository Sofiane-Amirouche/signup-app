const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Temporary in-memory user store (later replace with database)
let users = [];

// Signup route
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ name, email, password: hashedPassword, confirmed: false });
  res.send('Signup successful! Please confirm your email.');
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(400).send('User not found');
  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.status(400).send('Invalid password');
  if (!user.confirmed) return res.status(400).send('Please confirm your email first');

  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Logout route
app.get('/logout', (req, res) => {
  res.redirect('/index.html');
});

// Forgot password route (placeholder)
app.post('/forgot', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send('Email not found');
  res.send('Password reset link will be sent to your email.');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


