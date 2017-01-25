'use strict';

var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'client')));

app.get('/', function(req, res){
  res.sendfile('index.html');
});

var activeUserList = [];

app.get('/user-list', function(request, response){
   response.send(activeUserList);
});

app.post('/join-chat', function(request, response){
  var registerUser = request.body.userName;

  if (activeUserList.indexOf(registerUser) < 0) {
    activeUserList.push(registerUser);
    response.send({result:'ok'});
  } else {
      response.status(500).send({result:'username already exists'});
  }
});


//Socket.io connections
io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('join chat', function(username){
    console.log('message: ' + username + ' joined chat');
    socket.join('channel-public');
    socket.join('user-' + username);
    socket.broadcast.emit('joined chat message', username);
  });

  socket.on('join to room', function(message) {
    var roomName = 'channel-' + message.name;
    if (message.type === 'channel' && socket.rooms[roomName] === undefined) {
      console.log('message: ' + message.userName + ' joined to room: ' + message.name);
      socket.join(roomName);
      socket.broadcast.emit('joined to room', message);
    }
  });

  socket.on('chat message', function(message){
    var roomName = (message.thread.type === 'channel' ? 'channel-' : 'user-') + message.thread.name;
    socket.broadcast.to(roomName).emit('chat message', message);
  });



  socket.on('user typing', function(username){
    console.log('message: ' + username + ' is typing');
    io.emit('user is typing', username);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
