const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');

// 라우터 가져오기
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');

// 환경변수 설정
dotenv.config();

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 설정 (생성된 이미지 등)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 프론트엔드 빌드 파일 서빙 설정
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Socket.io 설정
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 소켓.io 연결 처리
io.on('connection', (socket) => {
  console.log('새로운 클라이언트 연결:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id);
  });
});

// 모든 라우터에서 socket.io 객체에 접근할 수 있도록 미들웨어 추가
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('이미지 생성 승인 시스템 API 서버');
});

// 프론트엔드 라우트를 위한 와일드카드 라우트 (React Router 지원)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval';
console.log('MongoDB 연결 시도:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
    // 서버 시작
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
    });
  })
  .catch(err => {
    console.error('MongoDB 연결 실패:', err);
  });

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({ 
    success: false, 
    message: '서버 내부 오류가 발생했습니다',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 프로세스 중단 이벤트 처리
process.on('SIGINT', () => {
  console.log('서버 종료 중...');
  mongoose.connection.close(() => {
    console.log('MongoDB 연결 종료');
    process.exit(0);
  });
}); 