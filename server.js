require('dotenv').config();
const mongoose = require("mongoose");
const express = require('express');
const cors = require('cors');
const socket = require('socket.io');
const webpush = require('web-push');
const cookieParser = require('cookie-parser');
const { v4: uuid } = require('uuid');
// routes
const routes = require('./routes/routes');
const auth = require('./routes/auth');
const pushNotifications = require('./routes/pushNotifications');
// models
const Chat = require('./models/chats');
const Chatroom = require('./models/chatrooms');
const LoggedInUsers = require('./models/loggedInUsers');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true });

const app = express();
const port = process.env.PORT || 8000;
const server = app.listen(port, () => console.log(`Server listening at PORT ${port} .....`));

// CORS
const whitelist = ["https://shubham-nazare-chattitude.netlify.app", 'http://localhost:3000'];
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

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(routes);
app.use(auth);
app.use(pushNotifications);

// Webpush for notifications
webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY)

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

    // Insert the chats
    const chat = Chat({
      ...docs
    })
    chat.save();

    // Push notification
    LoggedInUsers.findOne({ name: docs.userTo }, (err, doc) => {
      if(doc) {
        const payload = JSON.stringify({
          title: 'Chattitude',
          body: `${docs.userFrom} says : ${docs.text}`,
          icon: 'https://shubham-nazare-chattitude.netlify.app/logo192.png',
          data: {
            link: '/'
          }
        })
        webpush.sendNotification(JSON.parse(doc.subscription), payload)
          .then(result => console.log(result))
          .catch(e => console.log(e.stack))
      }
    })

    // Update chatroom
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