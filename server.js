const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = new Server(server);

// Cấp phát file HTML cho client
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/caro.html');
});

// Object lưu trữ trạng thái tất cả các phòng
const rooms = {};

// Hàm tạo ID phòng ngẫu nhiên (6 ký tự)
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Một người dùng kết nối:', socket.id);

    // 1. TẠO PHÒNG MỚI
    socket.on('create-room', () => {
        const roomId = generateRoomId();
        socket.join(roomId);
        socket.roomId = roomId;

        // Tỉ lệ 50% X, 50% O cho người tạo
        const creatorRole = Math.random() < 0.5 ? 'X' : 'O';
        const secondRole = creatorRole === 'X' ? 'O' : 'X';

        rooms[roomId] = {
            players: { [socket.id]: creatorRole },
            availableRole: secondRole, // Cất vai trò còn lại cho người thứ 2
            moves: [] // Lưu lịch sử nước đi
        };

        socket.emit('room-created', roomId);
        socket.emit('assign-role', creatorRole);
    });

    // 2. THAM GIA PHÒNG ĐÃ CÓ
    socket.on('join-room', (roomId) => {
        roomId = roomId.toUpperCase();
        if (!rooms[roomId]) {
            socket.emit('error-message', 'Phòng không tồn tại!');
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        const room = rooms[roomId];
        let role = 'Khán giả';

        // Nếu phòng chưa đủ 2 người chơi (tức là availableRole vẫn còn)
        if (room.availableRole) {
            role = room.availableRole;
            room.players[socket.id] = role;
            room.availableRole = null; // Đã đủ 2 người
        }

        socket.emit('room-joined', roomId);
        socket.emit('assign-role', role);
        
        // Gửi ngay trạng thái bàn cờ hiện tại cho người mới (đặc biệt là khán giả vào sau)
        socket.emit('sync-board', room.moves);
    });

    // 3. XỬ LÝ NƯỚC ĐI
    socket.on('play-move', (data) => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].moves.push(data);
            io.to(roomId).emit('receive-move', data);
        }
    });

    // 4. CHƠI LẠI
    socket.on('request-reset', () => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].moves = []; // Xóa lịch sử nước đi
            io.to(roomId).emit('reset-game');
        }
    });

    // 5. NGẮT KẾT NỐI
    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            // Nếu người chơi chính thoát, có thể xử lý xóa phòng ở đây nếu muốn
            delete rooms[roomId].players[socket.id];
            // Tạm thời giữ phòng cho khán giả xem, tự hủy khi không còn ai
            if (io.sockets.adapter.rooms.get(roomId)?.size === 0 || !io.sockets.adapter.rooms.get(roomId)) {
                delete rooms[roomId];
            }
        }
        console.log('Người dùng ngắt kết nối:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});