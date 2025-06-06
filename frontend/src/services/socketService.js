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
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('소켓 연결 성공!');
      this.isConnected = true;
      
      // 연결 성공 시 사용자 인증 정보 전송
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user._id) {
        this.socket.emit('authenticate', user);
        console.log('소켓 인증 정보 전송:', user._id);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('소켓 연결 종료됨!');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('소켓 연결 오류:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('소켓 재연결 성공! 시도 횟수:', attemptNumber);
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('소켓 재연결 오류:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('소켓 재연결 실패!');
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