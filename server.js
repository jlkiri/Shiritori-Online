const express = require('express');
const app = express();
const path = require('path');
const request = require('request');
const favicon = require('serve-favicon');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const helmet = require('helmet');

const defaultPath = "http://jisho.org/api/v1/search/words?keyword=";
const KEYS = {"あ":267, "い":233, "う":105, "え":135, "お":198,
  "か":402, "き":279, "く":117, "け":122, "こ":326, 
  "さ":190, "し":511, "す":142, "せ":218, "そ":110, 
  "た":167, "ち":175, "つ":65, "て":122, "と":156, 
  "な":85, "に":100, "ぬ":9, "ね":46, "の":43, 
  "は":191, "ひ":141, "ふ":194, "へ":56, "ほ":118, 
  "ま":115, "み":89, "む":51, "め":67, "も":68, 
  "や":55, "ゆ":71, "よ":78, 
  "ら":60, "り":113, "る":16, "れ":64, "ろ":58, 
  "わ":49, "が": 75, "ぎ": 53, "ぐ": 45, "げ": 65, "ご": 55, 
  "ざ": 26, "じ": 262, "ず": 9, "ぜ": 44, "ぞ": 19, 
  "だ": 88, "づ": 1, "で": 84, "ど": 83, 
  "ば": 79, "び": 49, "ぶ": 85, "べ": 35, "ぼ": 53, 
  "ぢ": 1
};

let userInfo = Object.create(null);
let names = new Map();

app.use(helmet());
app.use(express.static('public', {extensions: ['html', 'htm']}));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.get('/player/:query', async (req, res, next) => {
  let entry;
  try {
    entry = await readResponse(defaultPath + encodeURIComponent(req.params.query));
    res.json(entry);
  } catch(error) {
    next(error);
  }  
});

app.get('/aikana/:query', async (req, res, next) => {
  let entry;
  let pageNumber = Math.round(Math.random() * KEYS[req.params.query]) || 1;
  try {
    entry = await readResponse(defaultPath + "%23noun%20" + encodeURIComponent(req.params.query) + `&page=${pageNumber}`);
    res.json(entry);
  } catch(error) {
    next(error);
  }  
});

app.get('/aikanji/:query/:page', async (req, res, next) => {
  let entry;
  let pageNumber = req.params.page;
  try {
    entry = await readResponse(defaultPath + "%23noun%20" + encodeURIComponent(req.params.query) + pageNumber);
    res.json(entry);
  } catch(error) {
    next(error);
  }
});

app.get('/namecheck/:name/', (req, res, next) => {
  if (names.has(req.params.name)) {
    res.json({taken: true});
  }
  else res.json({taken: false});
});

app.use(errorHandler);

io.on('connection', function(socket) {

  socket.on('onjoin', function (data) {
    userInfo[socket.id] = {username: data.username, room: '', win: 0, available: true};
    names.set(data.username, socket.id);
    console.log(data.username + ' connected ');
    console.log(userInfo);
    io.emit('userlist', Object.values(userInfo));
  });

  socket.on('message', function ({to, params}) {
    let address = names.get(to);
    let room = new Date().valueOf().toString();    
    let {username} = userInfo[socket.id];
    userInfo[socket.id].room = room;
    socket.to(address).emit('message', {
        from: username,
        room: room,
        params: params
    });
    socket.join(room);
    console.log(`${username} joined ${room}`);
  });

  socket.on('userinfo', function ({username, available, leave}) {
    if (leave) {
      socket.leave(userInfo[socket.id].room);
      userInfo[socket.id].room = '';
    }
    userInfo[socket.id].username = username;
    userInfo[socket.id].available = available;
    console.log(userInfo);
    io.emit('userlist', Object.values(userInfo));
  });

  socket.on('accept', function ({to, room, params}) {
    let address = names.get(to);
    userInfo[socket.id].room = room;
    userInfo[socket.id].available = false;
    console.log(userInfo);
    io.emit('userlist', Object.values(userInfo));
    socket.to(address).emit('accepted', params);
    socket.join(room);
  });

  socket.on('reject', function ({to}) {
    let address = names.get(to);
    socket.to(address).emit('rejected');
  });

  socket.on('disconnecting', function () {
    if (socket.id in userInfo && 'room' in userInfo[socket.id]) {
      let {room} = userInfo[socket.id];
      socket.to(room).emit('win');
      socket.leave(room);
      names.delete(userInfo[socket.id].username);
    }    
  });

  socket.on('disconnect', function () {
    delete userInfo[socket.id];
    io.emit('userlist', Object.values(userInfo));
  });

  socket.on('guess', function(data) {
    let {room} = userInfo[socket.id];
    console.log(`guess by ${userInfo[socket.id].username} in a room ${room}`);
    socket.to(room).emit('word', data);
  });

  socket.on('lost', function(data) {
    let {room} = userInfo[socket.id];
    userInfo[socket.id].room = '';
    userInfo[socket.id].available = true;
    socket.to(room).emit('win');
    console.log(`${userInfo[socket.id].username} left room ${room}`);
    socket.leave(room);
  });

  socket.on('finish', function () {
    let {room} = userInfo[socket.id];
    userInfo[socket.id].available = true;
    userInfo[socket.id].room = '';
    userInfo[socket.id].win++;
    io.emit('userlist', Object.values(userInfo));
    console.log(`${userInfo[socket.id].username} left room ${room}`);
    console.log(userInfo);
    socket.leave(room);
  });

  socket.on('return', function () {
    userInfo[socket.id].available = true;
    io.emit('userlist', Object.values(userInfo));
  });
});

function readResponse(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      //console.log('statusCode:', response && response.statusCode);
      //console.log(body);
      if (error) reject(error);
      resolve(body);
    });
  });
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

http.listen(3000);
