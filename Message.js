const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: String,
    createdAt: Date ,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
});

module.exports = mongoose.model('Message', messageSchema);
module.exports.messageSchema = messageSchema