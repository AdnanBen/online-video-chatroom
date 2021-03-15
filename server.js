const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server)

const https = require('https');
const fs = require('fs');

const { v4:uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(requireHTTPS);


app.get('/', (req,res) => {
    res.redirect(`/${uuidV4()}`);
})


app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
})

io.on('connection', (socket) => {
    socket.on('join-room', function (roomId, userId) {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);
        
        socket.on('disconnect', () => {
        socket.to(roomId).broadcast.emit('user-disconnected', userId);
        })
    })
})

function requireHTTPS(req, res, next) {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  }

server.listen(process.env.PORT || 3000);

