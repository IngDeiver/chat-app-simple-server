const mongoose = require('mongoose');
const { messageSchema } = require('./Message')

const roomSchema = new mongoose.Schema({
    roomId: String,
    messages: [messageSchema]
});

module.exports = mongoose.model('Room', roomSchema);