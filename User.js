const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    oauth_id: String,
    push_id: String,
    photo: String
  });

  module.exports =  mongoose.model('User', userSchema);