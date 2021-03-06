const express = require("express");
const app = express();
const Chatroom = require('../models/chatrooms');
const Chat = require('../models/chats');
const User = require('../models/users');
const { v4: uuid } = require('uuid');

// Search users
app.post("/users/suggested", async (req, res) => {
  if (req.body.searchTxt !== "") {
    const docs = await User.find({ name: { $regex: req.body.searchTxt } });
    res.json(docs.map(val => val.name).sort())
  }
  else {
    res.json(["shubham4443", "LightYagami", "walter_white", "Tony Soprano", "Lelouch", "Vito Corleone"])
  }
})

// Create chatroom
app.post("/chatroom/create", (req, res) => {

  const { user1, user2 } = req.body;
  // check if chatroom exist
  Chatroom
    .find({
      "user1": { $in: [user1, user2] },
      "user2": { $in: [user1, user2] }
    })
    .exec((err, doc) => {
      if (err) res.sendStatus(500)

      if (doc.length > 0) {
        res.json({ chatroom_id: doc[0].chatroom_id })
      }
      else {
        const chatroom_id = uuid();
        const chatroom = new Chatroom({ chatroom_id, user1, user2, date: new Date(), last_text: "", user1unread: 0, user2unread: 0 })
        chatroom.save();
        res.json({ chatroom_id: "" })
      }
    })
})

// Get user's chatrooms
app.get("/chatrooms/fetch/:user", (req, res) => {
  Chatroom
    .find({
      $or: [
        { user1: req.params.user },
        { user2: req.params.user }
      ]
    })
    .sort('-date')
    .exec((err, docs) => {
      if (err) res.sendStatus(500)
      const users = docs.map(val => {
        if (val.user1 === req.params.user) {
          return {
            ...val,
            user: val.user2
          }
        }
        else {
          return {
            ...val,
            user: val.user1
          }
        }
      })
      res.json(users);
    })
})

// Get chats
app.get("/chats/fetch/:chatroom_id", (req, res) => {
  Chat
    .find({ chatroom_id: req.params.chatroom_id })
    .sort('date')
    .exec((err, docs) => {
      if (err) res.sendStatus(500)

      res.json(docs);
    })
})

// Set chats to read
app.post("/chats/read", (req, res) => {
  const { chatroom_id, user } = req.body;
  Chatroom.findOne({ chatroom_id: chatroom_id }, (err, doc) => {
    if (err) res.sendStatus(500)
    if (doc.user1 === user) {
      doc.user1unread = 0;
    } else {
      doc.user2unread = 0;
    }
    doc.save();
    res.sendStatus(200)
  })
})

module.exports = app;