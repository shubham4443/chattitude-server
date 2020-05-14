const express = require("express");
const app = express();
const User = require('./models/users');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const Chatroom = require('./models/chatrooms');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API);

const nodemailer = require("nodemailer");

nodemailer.createTestAccount()
.then((testAccount) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.etheral.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  })
  transporter.sendMail({
    from: "markeloff4443@gmail.com",
    to: "shubham4443@gmail.com",
    subject: "HELLO WORLD!!!",
    text: "tasasas"
  })
  .then((info) => console.log(info))
})

let refreshTokens = [];

app.post("/refresh", (req, res) => {
  refreshToken = req.body.refreshToken;
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    const accessToken = generateAccessToken({ name: user.name })
    res.json({ accessToken: accessToken })
  })
})

app.get("/verify", (req, res) => {
  if (!req.cookies.accessToken) return res.sendStatus(401);
  jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(401)

    res.json({ name: user.name });
  })
})

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
        const user = new User({ name: req.body.name, email: req.body.email, password: hash, verificationToken })
        user.save()
        const msg = {
          to: req.body.email,
          from: 'markeloff4443@gmail.com',
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
        const chatroom = new Chatroom({ chatroom_id: uuid(), user1: req.body.name, user2: "shubham4443", date: new Date(), last_text: "", user1unread: 0, user2unread: 0 })
        chatroom.save();
        res.json({ type: "success" })
      })
    })

  })
})

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
      doc.isVerified = true;
      doc.save();
      res.send(`EMAIL VERIFIED. You can login now at https://shubham-nazare-chattitude.netlify.app/`)
      return;
    }
  })
})

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
      const refreshToken = jwt.sign({ name: req.body.name }, process.env.REFRESH_TOKEN_SECRET);

      refreshTokens.push(refreshToken);
      res.cookie('accessToken', accessToken, { maxAge: process.env.ACCESS_TOKEN_LIFESPAN, httpOnly: true });
      res.json({ name: req.body.name, accessToken: accessToken, refreshToken: refreshToken })
    })
  })
})

app.delete("/logout", (req, res) => {
  if (req.body.refreshToken) refreshTokens.filter(val => val !== req.body.refreshToken)
  res.clearCookie("accessToken", { path: '/' })
  res.sendStatus(200)
})

const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_LIFESPAN })
}

module.exports = app;