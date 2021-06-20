
const express = require('express')
const app = express()
const port = 9000
const User = require('./User')
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ingdeiver:DEIBERandres1@cluster0.27szq.mongodb.net/chat-app?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Database connection error:'));
db.once('open', function () {
  console.log("Database connected");
});

app.use(express.json())

app.post('/user', (req, res) => {

  // I know, no use for real prod App...
  User.findOneAndUpdate({ push_id: req.body.push_id }, req.body, { new: true, overwrite: true }, function (error, result) {
    if (!error) {
      // If the document doesn't exist
      if (!result) {
        console.log("New account");
        // Create it
        new User(req.body).save()
          .then(_ => res.sendStatus(200))
          .catch(error => res.status(500).json({ error: error.message }))
      } else {
        console.log("Exist account");
      }

    } else {
      res.status(500).json({ error: error.message })
    }
  });
})

app.get('/user', async (req, res) => {
  try {
    const users = await User.find({})
    res.json({ users })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})