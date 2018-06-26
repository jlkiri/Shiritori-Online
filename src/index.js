import { el, list, mount, setChildren, text, unmount } from 'redom';
import {Popup, IncomingRequest, Li, Controls, SendRequest, Login} from './view';
import launchPVPGame from './pvp';
import launchSingleGame from './single_player';
import io from 'socket.io-client';
import { fetchOK } from './engine';

let socket = io();

Li.prototype.update = function ({id, user, available, win, nickname}) {
  let isMe = id === nickname;
  let fightButton = el('button.userlist__request-button', ``);
  let username =  el('span.userlist__username', text(user));
  let wins = el('span.userlist__win', `🏆${win}`);
  fightButton.onclick = () => {
    let request = new SendRequest();
    request.button.onclick = () => {
      let params = {speed: request.controls.speed, level: request.controls.level, mode: request.controls.modes.mode};
      socket.emit('message', {to: user, params});
      socket.emit('userinfo', {username: nickname, available: false});
      request.remove();
    }
  }
  if (available) {
    fightButton.disabled = false;
  } else {
    fightButton.disabled = true;
    username.textContent += ' (in game)';
  }
  setChildren(this.el, [isMe || fightButton, wins, username]);
}

function initialize(name) {
  let {userTable, singlePlayButton} = renderUI();
  let nickname = name;
  singlePlayButton.onclick = () => {
    let req = new SendRequest();
    req.button.textContent = 'Start';
    req.button.onclick = () => {
      let aux = document.querySelectorAll('.aux');
      aux.forEach(el => el.style.display = 'none');
      socket.emit('userinfo', {username: nickname, available: false});
      launchSingleGame(socket, {mode: req.controls.modes.mode, speed: req.controls.speed});
      req.remove();
    }
  }
  socket.on('userlist', data => {
    let list = data.map(({username, available, win}) => {
      return {id: username, user: username, available, win, nickname};
    });
    userTable.update(list);
  });
  socket.on('message', data => {
    popupRequest(nickname, userTable, data);
    socket.emit('userinfo', {username: nickname, available: false});
  });
  socket.on('rejected', data => {
    let popup = new Popup();
    popup.message.textContent = 'Request rejected';
    popup.show();
    socket.emit('userinfo', {username: nickname, available: true, leave: true});
  });
  socket.on('accepted', params => {
    launchPVPGame(socket, params, false);
    let aux = document.querySelectorAll('.aux');
    aux.forEach(el => el.style.display = 'none');
  });
}

function renderUI(name) {
  let userTable = list('ul.usertable', Li, 'id');
  let singlePlayButton = el('button.single', 'Play against AI');
  mount(document.body, el('section.userlist.aux', el('h4', 'Online now:'), userTable, singlePlayButton));
  return {
    userTable: userTable,
    singlePlayButton: singlePlayButton
  }
}

function popupRequest(username, ui, {from, room, params}) {
  let request = new IncomingRequest();
  request.message.textContent = `Battle request from ${from}.\nDifficulty: ${params.level}\nMode: ${params.mode}`;
  request.reject.onclick = () => {
    request.resolved = true;
    request.remove();
    socket.emit('reject', {to: from});
    socket.emit('userinfo', {username: username, available: true});
  };  
  request.accept.onclick = () => {
    request.resolved = true;
    request.remove();
    socket.emit('accept', {to: from, room: room, params: params});
    let aux = document.querySelectorAll('.aux');
    aux.forEach(el => el.style.display = 'none');
    launchPVPGame(socket, params, true);
  };
  request.show();
}

function greet() {
  if (sessionStorage.getItem('nickname')) {
    let username = sessionStorage.getItem('nickname');    
    initialize(username);
    socket.emit('onjoin', {
      username: username,
    });
  } else {
    let login = new Login();
    mount(document.body, login.el);
    login.submit.addEventListener('click', async function () {
      if (!login.field.value) {
        login.errorMessage.textContent = 'Enter your name!';
      }
      else if (login.field.value.length < 2) {
        login.errorMessage.textContent = 'Your name must be at least 2 characters long!';
      }
      else if (login.field.value.length > 16) {
        login.errorMessage.textContent = 'Your name must be shorter than 16 characters!';
      }
      else {
        let checkResult;
        let username = login.field.value.trim();
        try {
          checkResult = await nameCheck(username);
          if (checkResult) {
            sessionStorage.setItem('nickname', username);
            initialize(username);
            socket.emit('onjoin', {
              username: username,
            });
            unmount(document.body, login.el);
          } else {
            login.errorMessage.textContent = 'This name is already taken!';
          }
        }
        catch (error) {
          login.errorMessage.textContent = error;
        }
      }
    });
    login.field.focus();
  }
}

function nameCheck(name) {
  return new Promise((resolve, reject) => {
    fetchOK(`/namecheck/${name}`)
    .then(response => response.json())
    .then(result => {
      if (result.taken) resolve(false);
      else resolve(true);
    })
    .catch(e => reject(e));
  });
}

greet();




