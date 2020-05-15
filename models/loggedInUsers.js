const mongoose = require('mongoose');

const loggedInUsersSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subscription: {
    type: String,
    required: true
  }
})

const loggedInUsers = mongoose.model('loggedInUsers', loggedInUsersSchema);
module.exports = loggedInUsers;