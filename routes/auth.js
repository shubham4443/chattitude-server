require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { v4: uuid } = require('uuid');
// Models
const User = require('../models/users');
const Chatroom = require('../models/chatrooms');


sgMail.setApiKey(process.env.SENDGRID_API);
const app = express();

// TOKEN VERIFICATION
app.get("/verify", (req, res) => {
  if (!req.cookies.accessToken) return res.sendStatus(401);
  jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(401)

    res.json({ name: user.name });
  })
})

// REGISTER USER
app.post("/register", (req, res) => {

  User.findOne({
    $or: [
      { name: req.body.name },
      { email: req.body.email }
    ]
  }, (err, doc) => {
    if (doc) {
      res.json({ type: "error" })
      return;
    }
    bcrypt.genSalt(10, (err, salt) => {
      if (err) res.sendStatus(500)
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) res.sendStatus(500)

        const verificationToken = require('crypto').randomBytes(12).toString('hex');

        // Save user to DB
        const user = new User({ name: req.body.name, email: req.body.email, password: hash, verificationToken })
        user.save()

        // Send email verification
        const msg = {
          to: req.body.email,
          from: 'smnazare_b19@el.vjti.ac.in',
          subject: 'Chattitude: Email Verification',
          text: `Click on this link to verify your email ${process.env.HOST_URL}/verification?token=${verificationToken}&name=${req.body.name}`,
        };
        sgMail
          .send(msg)
          .then(() => { }, error => {
            console.error(error);

            if (error.response) {
              console.error(error.response.body)
            }
          });

        res.json({ type: "success" })
      })
    })

  })
})

// EMAIL VERIFICATION
app.get("/verification", (req, res) => {

  const { token, name } = req.query;

  User.findOne({ verificationToken: token, name }, (err, doc) => {

    if (!doc) {
      res.send("FORBIDDEN LINK")
      return;
    }

    if (doc.isVerified) {
      res.send("You are already verified")
      return;
    }
    else {
      // Set verified to true
      doc.isVerified = true;
      doc.save();

      // Create first chatroom with shubham4443
      const chatroom = new Chatroom({ chatroom_id: uuid(), user1: name, user2: "shubham4443", date: new Date(), last_text: "", user1unread: 0, user2unread: 0 })
      chatroom.save();

      res.send(`EMAIL VERIFIED. You can login now at https://shubham-nazare-chattitude.netlify.app/`)
      return;
    }

  })
})

// LOGIN
app.post("/login", async (req, res) => {

  User.findOne({ name: req.body.name }, (err, doc) => {

    if (!doc) {
      res.json({ status: "error", message: "Username does not exist" })
      return;
    }

    if (!doc.isVerified) {
      res.json({ status: "error", message: "Your email is not verified. Verify your email and try again" })
      return;
    }

    bcrypt.compare(req.body.password, doc.password, (err, result) => {

      if (err || !result) {
        res.json({ status: "error", message: "Password incorrect" })
        return;
      }

      const accessToken = generateAccessToken({ name: req.body.name })
      res.cookie('accessToken', accessToken, { maxAge: process.env.ACCESS_TOKEN_LIFESPAN, httpOnly: true });
      res.json({ name: req.body.name, accessToken: accessToken })

    })
  })
})


// LOGOUT
app.delete("/logout", (req, res) => {

  res.clearCookie("accessToken", { path: '/' })
  res.sendStatus(200)

})

// Generate JWT
const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_LIFESPAN })
}

module.exports = app;