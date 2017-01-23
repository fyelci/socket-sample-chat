var socket = io();

var userName = '';
var userRegistered = false;

var connectedUserList = [];

var activeThread = {type: 'channel', name:'public'};

function getUserList () {
  $.get( "/user-list")
  .done(function (data) {
    connectedUserList = data;

    $('.connected-user-and-channel-list ul.user-list li :not(.title)').remove();

    for (var i = 0; i < connectedUserList.length; i++) {
      if (connectedUserList[i] !== userName) {
        $('.connected-user-and-channel-list ul.user-list')
          .append($('<li data-thread-type="user" data-user="' + connectedUserList[i] + '">')
          .text(connectedUserList[i]));
      }
    }
  });
}

//Join to chat
$('.join-chat-form').submit(function(){
  if (!userRegistered) {
    userName = $('#nickname').val();

    $.post( "/join-chat", {userName: userName})
      .done(function() {
        $(".join-chat-form input").prop("disabled", true);
        $('.join-chat-form button').toggleClass('disabled-button');
        userRegistered = true;
        $('#m').focus();

        socket.emit('join chat', userName);

        getUserList();
      })
      .fail(function(response) {
        console.error(response);
        alert("error when joining chat: " + response.responseText.result);
      });

  } else {
    console.warn('user already registered');
  }
  return false;
});

// handle join messages from socket
socket.on('joined chat message', function(msg){
  $('#messages').append($('<li class="joined-message">').text(msg + ' joined chat'));
  if (connectedUserList.indexOf(msg) < 0) {
    connectedUserList.push(msg);
    $('.connected-user-and-channel-list ul.user-list')
      .append($('<li data-thread-type="user" data-user="' + msg + '">')
      .text(msg));
  }
});

// user is typing
$('#m').keyup(function() {
  if ($('#m').val()) {
    socket.emit('user typing', userName);
  }
});

socket.on('user is typing', function(msg){
  if (msg === userName) {
    return;
  }
  //clear if ther is a typing message
  if ($('#user-typing-' + msg).length > 0) {
    $('#user-typing-' + msg).remove();
  }

  // add typing message
  $('#user-is-typing').append($('<li id="user-typing-' + msg + '">').text(msg + ' is typing ...'));

  // remove message after 3 seconds
  setTimeout(function(){
    if ($('#user-typing-' + msg).length > 0) {
      $('#user-typing-' + msg).remove();
    }
  }, 3000);
});


// send chat message
$('.send-message-form').submit(function(){
  if (userName !== '') {
    var message = {
      userName : userName,
      text : $('#m').val(),
      time: new Date().getTime()
    };
    if (!message.text.trim()) {
      alert('message can not be empty!');
    }
    socket.emit('chat message', message);
    $('#m').val('');
    addMessageToList(message);
  } else {
    alert('You should join chat first!');
  }
  return false;
});

// handle chat messages from socket
socket.on('chat message', function(msg){
  if (msg.userName !== userName) {
    addMessageToList(msg);
  }
});

function addMessageToList (msg) {
  $('#messages').append('<li><span class="username">' + msg.userName + '</span>: ' + msg.text + '<span class="time">' + new Date(msg.time).toLocaleString().substr(0,16) + '</span></li>');

  //remove if user typing exists
  if ($('#user-typing-' + msg.userName).length > 0) {
    $('#user-typing-' + msg.userName).remove();
  }
}


//user clicked
$('.connected-user-and-channel-list ul').click(function(event) {
  activeThread =
  {
    type: $(event.target).data('threadType'),
    name:$(event.target).data('user')
  };
  $('.connected-user-and-channel-list ul li.active').toggleClass('active');
  $(event.target).toggleClass('active');
});
