const express = require("express");
const app = express();
const port = 9000;
const User = require("./User");
const Room = require("./Room");
const Message = require("./Message");
const mongoose = require("mongoose");
const admin = require("firebase-admin");
const activeSocketsDirectory = {}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

mongoose.connect(process.env.CHAT_APP_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Database connection error:"));
db.once("open", function () {
  console.log("Database connected");
});

const sendNotifcationsAllUsersExecpNewUser = async (newUserPushId) => {
  const users = await User.find({});
  const tokens = users
    .map((user) => user.push_id)
    .filter((push_id) => push_id !== newUserPushId);

  if (tokens.length > 0) {
    const message = {
      notification: {
        title: "New user",
        body: "New user was register in ChatApp,  it!",
        imageUrl:
          "https://www.shareicon.net/data/2016/06/30/788859_add_512x512.png",
      },
      data: {
        screen: "Users",
      },
      tokens,
    };

    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log(response.successCount + " messages were sent successfully");
      })
      .catch((err) => {
        console.log(err.message);
        return next(err);
      });
  }
};

const createOrUpdateUserWithOauth = (req, res) => {
  console.log("OAUTH");
  const push_id = req.body.push_id;
  User.findOneAndUpdate(
    { oauth_id: req.body.oauth_id },
    req.body,
    { new: true, overwrite: true },
    function (error, result) {
      if (!error) {
        // If the document doesn't exist
        if (!result) {
          console.log("New account");
          // Create it
          new User(req.body)
            .save()
            .then((doc) => {
              sendNotifcationsAllUsersExecpNewUser(push_id);
              res.json({
                push_id,
                _id: doc._id,
              });
            })
            .catch((error) => {
              console.log(error.message);
              return next(err);
            });
        } else {
          console.log("Exist account");
          res.json({
            push_id,
            _id: result._id,
          });
        }
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  );
};

const createOrUpdateUserWithFingerPrintMethod = (req, res) => {
  console.log("FP");
  const push_id = req.body.push_id;
  User.findOneAndUpdate(
    { name: req.body.name },
    req.body,
    { new: true, overwrite: true },
    function (error, result) {
      if (!error) {
        // If the document doesn't exist
        if (!result) {
          console.log("New account");
          // Create it
          new User(req.body)
            .save()
            .then((doc) => {
              sendNotifcationsAllUsersExecpNewUser(push_id);
              res.json({
                push_id,
                _id: doc._id,
              });
            })
            .catch((error) => {
              console.log(error.message);
              return next(err);
            });
        } else {
          console.log("Exist account");
          res.json({
            push_id,
            _id: result._id,
          });
        }
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  );
};

app.use(express.json());

app.post("/user", (req, res, next) => {
  const oauth_id = req.body.oauth_id;
  if (oauth_id) {
    createOrUpdateUserWithOauth(req, res);
  } else {
    createOrUpdateUserWithFingerPrintMethod(req, res);
  }
});

app.get("/user", async (req, res, next) => {
  try {
    const users = await User.find({});
    res.json({ users });
  } catch (error) {
    return next(err);
  }
});

app.post("/notification", async (req, res, next) => {
  const body = req.body.body;
  const tokenUserAuthenticated = req.body.tokenUserAuthenticated;
  const tokenUserToSend = req.body.tokenUserToSend;
  const roomId = req.body.roomId;
  const nameUserToSend = req.body.nameUserToSend;

  try {
    const message = {
      notification: {
        title: "New message",
        body,
      },
      data: {
        screen: "Chat",
        toUser: req.body.from, // _id (reversed sense)
        tokenUserToSend: tokenUserAuthenticated,
        nameUserToSend,
      },
      token: tokenUserToSend,
    };

    console.log("ROOM_id: ", roomId);
    // add new message to room
    const newMessage = new Message({
      text: body,
      createdAt: new Date(),
      user: req.body.from,
    })
    const room = await Room.updateOne(
      { _id: roomId },
      {
        $push: {
          messages: newMessage,
        },
      }
    );

    if (room.nModified > 0) { // send message and push notification 
      const TO = req.body.to
      console.log("Directory: ", activeSocketsDirectory);
      console.log("User Id - socket: ", TO);
      const theSocketId = activeSocketsDirectory[TO]
      const socketInstanceUserToSendMessage = await io.in(theSocketId).fetchSockets();
      
      if(socketInstanceUserToSendMessage.length > 0){
        Message.populate(newMessage, { path: 'user', model: 'User'},function (err, newMessagePopulate) {
          if (err) {
            return next(err);
          }
          socketInstanceUserToSendMessage[0].emit("private-message", newMessagePopulate, roomId,  req.body.from)
          socketInstanceUserToSendMessage[0].emit("new-message", req.body.from)
        })
        
      }else{
        console.log(`${TO} NO connected`);
      }

      admin
        .messaging()
        .send(message)
        .then((response) => {
          // Response is a message ID string.
          console.log("Successfully sent message:", response);
          res.sendStatus(200);
        })
        .catch((error) => {
          console.log("Error sending message:", error);
          return next(error);
        });
    }
  } catch (error) {
    console.log("ERROR-->", error.message);
    return next(error);
  }
});

app.post("/room", async (req, res, next) => {
  try {
    const from = req.body.from;
    const to = req.body.to;

    let room = await Room.findOne({
      roomId: {
        $in: [`${from}/${to}`, `${to}/${from}`],
      },
    }).exec();

    if (room) {
      console.log("Room exist: ");
      Room.populate(
        room,
        { path: "messages.user", model: "User" },
        function (err, user) {
          if (err) {
            return next(err);
          }
          res.json(user);
        }
      );
    } else {
      room = await new Room({ roomId: `${from}/${to}`, messages: [] }).save();
      console.log("New Room: ");
      res.json(room);
    }
  } catch (error) {
    console.log("ERROR-->", error.message);
    return next(error);
  }
});

const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);



io.on('connect', async (socket) => {
  console.log("New socket connection: ", socket.id);

  socket.on("disconnect", () => {
  console.log("Disconnect: ", socket.id);
   delete activeSocketsDirectory[socket.handshake.query.userId] 
   console.log("New directory: ", activeSocketsDirectory);
  });

  activeSocketsDirectory[socket.handshake.query.userId] = socket.id
  console.log("Directory: ", activeSocketsDirectory);
})



httpServer.listen(port);
