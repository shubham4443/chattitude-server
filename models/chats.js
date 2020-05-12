const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({ 
  chat_id: {
    type: String,
    required: true,
    unique: true
  },
  chatroom_id: {
    type: String,
    required: true
  },
  userFrom: {
    type: String,
    required: true
  },
  userTo: {
    type: String,
    required: true 
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
 });

const Chat = mongoose.model('chat', chatSchema)
module.exports = Chat;