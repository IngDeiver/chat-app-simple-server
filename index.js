
const express = require('express')
const app = express()
const port = 9000
const User = require('./User')
const mongoose = require('mongoose');

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

mongoose.connect(process.env.CHAT_APP_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Database connection error:'));
db.once('open', function () {
  console.log("Database connected");
});

const sendNotifcationsAllUsersExecpNewUser = async (newUserPushId) => {

  const users = await User.find({})
  const tokens = users.map(user => user.push_id).filter(push_id => push_id !== newUserPushId)

  if (tokens.length > 0) {
    const message = {
      notification: {
        title: 'New user',
        body: 'New user was register in ChatApp,  it!',
        imageUrl: 'https://www.shareicon.net/data/2016/06/30/788859_add_512x512.png'
      },
      data: {
        screen: 'Users',
      },
      tokens
    };

    admin.messaging().sendMulticast(message)
      .then((response) => {
        console.log(response.successCount + ' messages were sent successfully');
      }).catch(err => console.log(err.message));
  }

}


const createOrUpdateUserWithOauth = (req, res) => {
  console.log("OAUTH");
  const push_id = req.body.push_id
  User.findOneAndUpdate({ oauth_id: req.body.oauth_id }, req.body, { new: true, overwrite: true }, function (error, result) {
    if (!error) {
      // If the document doesn't exist
      if (!result) {
        console.log("New account");
        // Create it
        new User(req.body).save()
          .then(doc => {
            sendNotifcationsAllUsersExecpNewUser(push_id)
            res.json({
              push_id,
              _id: doc._id
            })
          })
          .catch(error => {
            console.log(error.message);
            res.status(500).json({ error: error.message })
          })
      } else {
        console.log("Exist account");
        res.json({
          push_id,
          _id: result._id
        })
      }

    } else {
      res.status(500).json({ error: error.message })
    }
  });
}


const createOrUpdateUserWithFingerPrintMethod = (req, res) => {
  console.log("FP");
  const push_id = req.body.push_id
  User.findOneAndUpdate({ name: req.body.name }, req.body, { new: true, overwrite: true }, function (error, result) {
    if (!error) {
      // If the document doesn't exist
      if (!result) {
        console.log("New account");
        // Create it
        new User(req.body).save()
          .then(doc => {
            sendNotifcationsAllUsersExecpNewUser(push_id)
            res.json({
              push_id,
              _id: doc._id
            })
          })
          .catch(error => {
            console.log(error.message);
            res.status(500).json({ error: error.message })
          })
      } else {
        console.log("Exist account");
        res.json({
          push_id,
          _id: result._id
        })
      }

    } else {
      res.status(500).json({ error: error.message })
    }
  });
}

app.use(express.json())

app.post('/user', (req, res) => {
  const oauth_id = req.body.oauth_id
  if (oauth_id) {
    createOrUpdateUserWithOauth(req, res)
  } else {
    createOrUpdateUserWithFingerPrintMethod(req, res)
  }

})

app.get('/user', async (req, res) => {
  try {
    const users = await User.find({})
    res.json({ users })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/notification', (req, res) => {
  console.log("Message: ",req.body);
  const messages = req.body.messages
  try {
    const message = {
      notification: {
        title: 'New message',
        body: messages[0].text,
      },
      data: {
        screen: 'Chat',
        messages: JSON.stringify(messages),
        fromUser: req.body.from // user own, for answer messages
      },
      token: req.body.tokenUserToSend
    };

    admin.messaging().send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
  
  } catch (error) {
    console.log("ERROR-->", error.message);
    res.status(500).json({ error: error.message })
  }
})


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})