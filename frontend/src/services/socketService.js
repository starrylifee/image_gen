import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // 소켓 연결 설정
  connect() {
    if (this.socket) return;

    this.socket = io('/', {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    this.socket.on('connect', () => {
      console.log('소켓 연결 성공!');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('소켓 연결 종료됨!');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('소켓 연결 오류:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  // 소켓 연결 해제
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 소켓 객체 반환
  getSocket() {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  // 특정 이벤트 구독
  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.on(event, callback);
  }

  // 특정 이벤트 구독 해제
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // 이벤트 발행
  emit(event, data) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.emit(event, data);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const socketService = new SocketService();
export default socketService; 