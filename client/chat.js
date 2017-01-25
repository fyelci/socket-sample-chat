(function(){
  'use strict'

  var socket = io();

  var currentUserName = '';
  var userRegistered = false;

  var connectedUserList = [];

  var activeThread = {type: 'channel', name:'public'};

  function getUserList () {
    $.get( "/user-list")
      .done(function (data) {
        connectedUserList = data;

        $('.connected-user-and-channel-list ul.user-list li :not(.title)').remove();

        for (var i = 0; i < connectedUserList.length; i++) {
          if (connectedUserList[i] !== currentUserName) {
            $('.connected-user-and-channel-list ul.user-list')
              .append($('<li data-thread-type="user" data-channel="' + connectedUserList[i] + '">')
                .text(connectedUserList[i]));
          }
        }
      });
  }

//Join to chat
  $('.join-chat-form').submit(function(){
    if (!userRegistered) {
      currentUserName = $('#nickname').val();
      if (!currentUserName) {
        alert('You must provide a user name!')
      }

      $.post( "/join-chat", {userName: currentUserName})
        .done(function() {
          $(".join-chat-form input").prop("disabled", true);
          $('.join-chat-form button').toggleClass('disabled-button');
          userRegistered = true;
          $('#m').focus();

          activeThread.userName = currentUserName;

          socket.emit('join chat', currentUserName);

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
  socket.on('joined chat message', function(connectedUser){
    if (userRegistered) {
      $('#channel-public-messages').append($('<li class="joined-message">').text(connectedUser + ' joined chat'));
      if (connectedUserList.indexOf(connectedUser) < 0) {
        connectedUserList.push(connectedUser);
        $('.connected-user-and-channel-list ul.user-list')
          .append($('<li data-thread-type="user" data-channel="' + connectedUser + '">')
            .text(connectedUser));
      }
    }
  });

  // user is typing
  $('#m').keyup(function() {
    if ($('#m').val()) {
      socket.emit('user typing', currentUserName);
    }
  });

  socket.on('user is typing', function(typingUser){
    if (typingUser === currentUserName) {
      return;
    }
    //clear if ther is a typing message
    if ($('#user-typing-' + typingUser).length > 0) {
      $('#user-typing-' + typingUser).remove();
    }

    // add typing message
    $('#user-is-typing').append($('<li id="user-typing-' + typingUser + '">').text(typingUser + ' is typing ...'));

    // remove message after 3 seconds
    setTimeout(function(){
      if ($('#user-typing-' + typingUser).length > 0) {
        $('#user-typing-' + typingUser).remove();
      }
    }, 2000);
  });


  // send chat message
  $('.send-message-form').submit(function(){
    if (userRegistered) {
      var message = {
        senderUser: currentUserName,
        text : $('#m').val(),
        time: new Date().getTime(),
        toChannel: activeThread.type === 'channel' ? activeThread.name : undefined,
        toUser: activeThread.type === 'user' ? activeThread.name : undefined,
        messageType: activeThread.type
      };
      if (!message.text.trim()) {
        alert('message can not be empty!');
      }
      socket.emit('chat message', message);
      $('#m').val('');
      appendMessageToList(message, '.messages-body ul.active');
    } else {
      alert('You should join chat first!');
    }
    return false;
  });

  // handle chat messages from socket
  socket.on('chat message', function(msg){
    addMessageToList(msg);
  });

  function addMessageToList (msg) {
    var channelOrUser = (msg.messageType === 'channel' ? msg.toChannel : msg.senderUser);
    var threadSelector = '#' + msg.messageType + '-' + channelOrUser + '-messages';

    if ($(threadSelector).length === 0) {
      var threadId = msg.messageType + '-' + channelOrUser + '-messages';
      $('.messages-body ')
        .append('<ul class="thread" id="' + threadId + '"></ul>');
    }

    appendMessageToList(msg, threadSelector);

    var leftMenuSelector = '.'+ msg.messageType +'-list [data-channel="'+channelOrUser+'"]';
    if (!$(leftMenuSelector).hasClass('active')) {
      if ($(leftMenuSelector + ' .badge').length == 0) {
        $(leftMenuSelector).append('<span class="pull-right badge">1</span>');
      } else {
        $(leftMenuSelector + ' .badge').html(parseInt($(leftMenuSelector + ' .badge').html()) + 1);
      }
    }

    //remove if user typing exists
    if ($('#user-typing-' + msg.senderUser).length > 0) {
      $('#user-typing-' + msg.senderUser).remove();
    }
  }


  function appendMessageToList(msg, threadSelector) {
    $(threadSelector)
      .append('<li><span class="username">'
        + msg.senderUser + '</span>: '
        + msg.text + '<span class="time">'
        + new Date(msg.time).toLocaleString().substr(0,16)
        + '</span></li>');
  }

//user clicked
  $('.connected-user-and-channel-list ul').click(function(event) {
    if ($(event.target).hasClass('title')) {
      return;
    }
    activeThread.type = $(event.target).data('threadType');
    activeThread.name = $(event.target).data('channel');

    $('.connected-user-and-channel-list ul li.active').toggleClass('active');
    $(event.target).toggleClass('active');

    socket.emit('join to room', activeThread);




    var threadSelector = '#' + activeThread.type + '-' + activeThread.name + '-messages';

    //add thread html if not exists
    if ($(threadSelector).length === 0) {
      var threadId = activeThread.type + '-' + activeThread.name + '-messages';
      $('.messages-body ')
        .append('<ul class="thread" id="' + threadId + '"></ul>');
    }

    //make the active thread visible
    if (!$(threadSelector).hasClass('active')) {
      $('.messages-body .thread.active').toggleClass('active');
      $(threadSelector).toggleClass('active');
    }
  });


})();





