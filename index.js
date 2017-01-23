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


io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });

  socket.on('join chat', function(msg){
    console.log('message: ' + msg + ' joined chat');
    io.emit('joined chat message', msg);
    activeUserList.push(msg);
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
