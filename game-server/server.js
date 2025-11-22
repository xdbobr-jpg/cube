// --- СЕРВЕРНЫЙ КОД NODE.JS (РАБОТАЕТ НА RENDER) ---
// Файл: game-server/server.js
// Добавлена функция отдачи index.html по HTTP-запросу и обработка ЧАТА.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.IO, чтобы разрешить подключение с любых доменов
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// === ОБРАБОТКА HTTP ЗАПРОСОВ (ОТДАЧА КЛИЕНТА) ===
app.get('/', (req, res) => {
    // Отправляем файл index.html, который лежит уровнем выше от game-server
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Глобальное состояние игры: хранит всех подключенных игроков.
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

  // 2. Обработка движения (WASD/ЦФЫВ)
  socket.on('move', (direction) => {
    const player = players[socket.id];
    if (player) {
      // Обновление позиции
      switch (direction) {
        case 'w': player.y -= PLAYER_SPEED; break;
        case 's': player.y += PLAYER_SPEED; break;
        case 'a': player.x -= PLAYER_SPEED; break;
        case 'd': player.x += PLAYER_SPEED; break;
      }

      // Ограничение движения в пределах поля
      player.x = Math.max(0, Math.min(800 - 30, player.x));
      player.y = Math.max(0, Math.min(600 - 30, player.y));
      
      // Отправляем всем обновленные координаты этого игрока
      io.emit('playerMoved', {
        id: player.id,
        x: player.x,
        y: player.y
      });
    }
  });
  
  // 3. ОБРАБОТКА ЧАТА: Принимаем сообщение и рассылаем всем (включая отправителя)
  socket.on('chatMessage', (message) => {
      const player = players[socket.id];
      if (player) {
          const chatData = {
              nickname: player.nickname,
              text: message.substring(0, 150), // Ограничение длины сообщения
              color: player.color
          };
          io.emit('chatMessage', chatData); // Рассылаем всем
      }
  });

  // 4. Обработка отключения
  socket.on('disconnect', () => {
    console.log(`[SERVER] Пользователь отключен: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Вспомогательная функция для генерации случайного цвета
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