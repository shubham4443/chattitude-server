const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({ 
  chatroom_id: {
    type: String,
    required: true,
    unique: true
  },
  user1: {
    type: String,
    required: true
  },
  user2: {
    type: String,
    required: true 
  },
  last_text: {
    type: String
  },
  date: {
    type: Date
  },
  user1unread: {
    type: Number,
    default: 0
  },
  user2unread: {
    type: Number,
    default: 0
  }
 });

const Chatroom = mongoose.model('chatrooms', chatroomSchema)
module.exports = Chatroom;