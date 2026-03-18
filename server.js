const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Tên file html bạn đã đổi
const FILE_NAME = 'caro.html'; 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, FILE_NAME));
});

let players = {}; // Lưu danh sách người chơi

io.on('connection', (socket) => {
    console.log('Một người chơi đã kết nối: ' + socket.id);

    // Phân vai: Người vào đầu tiên là X, người thứ hai là O
    if (Object.keys(players).length === 0) {
        players[socket.id] = 'X';
    } else if (Object.keys(players).length === 1) {
        players[socket.id] = 'O';
    } else {
        players[socket.id] = 'Viewer'; // Người thứ 3 trở đi chỉ được xem
    }

    // Gửi vai trò về cho người chơi
    socket.emit('assign-role', players[socket.id]);

    // Nhận nước đi và gửi cho tất cả mọi người
    socket.on('play-move', (data) => {
        io.emit('receive-move', data);
    });

    // Reset game cho tất cả
    socket.on('request-reset', () => {
        io.emit('reset-game');
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('Người chơi đã thoát.');
    });
});

http.listen(3000, () => {
    console.log('Server CARO đang chạy tại port 3000!');
});