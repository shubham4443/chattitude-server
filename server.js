const mongoose = require("mongoose");
const express = require('express');
const routes = require('./routes');
const auth = require('./auth');
const cors = require('cors');
const socket = require('socket.io');
const cookieParser = require('cookie-parser');
const Chat = require('./models/chats');
const Chatroom = require('./models/chatrooms');
const { v4: uuid } = require('uuid');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true });

const app = express();
const port = process.env.PORT || 8000;
const server = app.listen(port, () => console.log(`Server listening at PORT ${port} .....`));

const whitelist = ["https://shubham-nazare-chattitude.netlify.app", 'http://localhost:3000', "http://u16179152.ct.sendgrid.net"];
app.use(cors({
  credentials: true, 
  origin: function (origin, callback) {
    if (origin === undefined || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}));
app.use(cookieParser());
app.use(express.json());
app.use(routes);
app.use(auth);

// Socket setup & pass server
let counter = 1;
const io = socket(server);
io.on('connection', (socket) => {
  console.log(`made socket connection ${counter++}`, socket.id);

  socket.on('room', (chatroom_id) => {
    socket.join(chatroom_id);
  })

  socket.on("send", (data) => {

    const chat_id = uuid();

    const docs = {
      chat_id,
      chatroom_id: data.chatroom_id,
      userFrom: data.userFrom,
      userTo: data.userTo,
      text: data.text,
      date: new Date()
    }

    const chat = Chat({
      ...docs
    })

    chat.save();
    Chatroom.findOne({ chatroom_id: data.chatroom_id }, (err, doc) => {
      doc.last_text = data.text;
      doc.date = new Date();
      if (data.userFrom === doc.user1) {
        doc.user2unread = doc.user2unread + 1;
      } else {
        doc.user1unread = doc.user1unread + 1;
      }
      doc.save();
    })

    io.to(data.chatroom_id).emit('message', docs);
  })
})