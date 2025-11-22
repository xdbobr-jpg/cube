// --- Серверный код Node.js для Render ---
// ВАЖНО: Ничего здесь не меняйте.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Разрешаем подключение с любых доменов (нужно для Render и вашего HTML-файла)
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const players = {};
const PLAYER_SPEED = 5;

io.on('connection', (socket) => {
  console.log(`[SERVER] Пользователь подключен: ${socket.id}`);

  // 1. Обработка регистрации (никнейма)
  socket.on('register', (nickname) => {
    if (!players[socket.id]) {
      players[socket.id] = {
        id: socket.id,
        nickname: nickname.substring(0, 10), 
        x: Math.floor(Math.random() * 700) + 50, 
        y: Math.floor(Math.random() * 500) + 50, 
        color: getRandomColor()
      };
      
      socket.emit('currentPlayers', players);
      socket.broadcast.emit('newPlayer', players[socket.id]);
      console.log(`[SERVER] Игрок зарегистрирован: ${nickname}`);
    }
  });

  // 2. Обработка движения WASD
  socket.on('move', (direction) => {
    const player = players[socket.id];
    if (player) {
      switch (direction) {
        case 'w': player.y -= PLAYER_SPEED; break;
        case 's': player.y += PLAYER_SPEED; break;
        case 'a': player.x -= PLAYER_SPEED; break;
        case 'd': player.x += PLAYER_SPEED; break;
      }

      // Обновляем позицию у всех подключенных клиентов
      io.emit('playerMoved', {
        id: player.id,
        x: player.x,
        y: player.y
      });
    }
  });

  // 3. Обработка отключения
  socket.on('disconnect', () => {
    console.log(`[SERVER] Пользователь отключен: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; }
  return color;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] Сервер запущен на порту: ${PORT}`);
});