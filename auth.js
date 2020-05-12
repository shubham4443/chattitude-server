const express = require("express");
const app = express();
const User = require('./models/users');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

let refreshTokens = [];

app.post("/refresh", (req, res) => {
  refreshToken = req.body.refreshToken;
  if(!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if(err) return res.sendStatus(403)
    const accessToken = generateAccessToken({name: user.name})
    res.json({accessToken: accessToken})
  })
})

app.get("/verify", (req, res) => {
  if(!req.cookies.accessToken) return res.sendStatus(401);
  jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if(err) return res.sendStatus(401)

    res.json({name: user.name});
  })
})

app.post("/register", (req, res) => {
  User.findOne({name: req.body.name}, (err, doc) => {
    if(doc) {
      res.json({type: "error"})
      return;
    }
    bcrypt.genSalt(10, (err, salt) => {
      if (err) res.sendStatus(500)
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) res.sendStatus(500)
        const user = new User({name: req.body.name, password: hash})
        user.save()
        res.json({type:"success"})
      })
    })

  })
})

app.post("/login", async (req, res) => {
  User.findOne({name: req.body.name}, (err, doc) => {
    if (!doc) {
      res.sendStatus(403)
      return;
    }
    bcrypt.compare(req.body.password, doc.password, (err, result) => {
      if(err || !result){
        res.sendStatus(403)
        return;
      }
      const accessToken = generateAccessToken({name: req.body.name})
      const refreshToken = jwt.sign({name: req.body.name}, process.env.REFRESH_TOKEN_SECRET);

      refreshTokens.push(refreshToken); 
      res.cookie('accessToken', accessToken, {maxAge: process.env.ACCESS_TOKEN_LIFESPAN, httpOnly: true});
      res.json({name:req.body.name, accessToken: accessToken, refreshToken: refreshToken})
    })
  })
})

app.delete("/logout", (req, res) => {
  if(req.body.refreshToken) refreshTokens.filter(val => val !== req.body.refreshToken)
  res.clearCookie("accessToken", {path:'/'})
  res.sendStatus(200)
})

const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_LIFESPAN})
}

module.exports = app;