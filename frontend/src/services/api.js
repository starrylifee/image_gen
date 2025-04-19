import axios from 'axios';

// 상대 경로로 API URL 설정
const API_URL = '/api';

// 인증 헤더 설정을 위한 인터셉터
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 인증 관련 API
export const authAPI = {
  login: async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '로그인 중 오류가 발생했습니다.' };
    }
  },

  register: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '회원가입 중 오류가 발생했습니다.' };
    }
  },

  verify: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/verify`);
      return response.data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error.response?.data || { message: '인증 토큰이 유효하지 않습니다.' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// 학생 관련 API
export const studentAPI = {
  submitPrompt: async (content) => {
    try {
      const response = await axios.post(`${API_URL}/student/submit-prompt`, { prompt: content });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '프롬프트 제출 중 오류가 발생했습니다.' };
    }
  },

  getStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/student/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '상태 확인 중 오류가 발생했습니다.' };
    }
  }
};

// 교사 관련 API
export const teacherAPI = {
  getPendingPrompts: async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/pending-prompts`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '대기 중인 프롬프트 조회 중 오류가 발생했습니다.' };
    }
  },

  getPendingImages: async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/pending-images`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '대기 중인 이미지 조회 중 오류가 발생했습니다.' };
    }
  },

  processPrompt: async (promptId, status, rejectionReason = null) => {
    try {
      const response = await axios.post(`${API_URL}/teacher/process-prompt`, {
        promptId,
        status,
        rejectionReason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '프롬프트 처리 중 오류가 발생했습니다.' };
    }
  },

  processImage: async (imageId, status, rejectionReason = null) => {
    try {
      const response = await axios.post(`${API_URL}/teacher/process-image`, {
        imageId,
        status,
        rejectionReason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: '이미지 처리 중 오류가 발생했습니다.' };
    }
  }
};

// 소켓 이벤트 구독을 위한 유틸리티
export const setupSocketListeners = (socket, callbacks) => {
  if (!socket) return;

  // 프롬프트 상태 업데이트 이벤트
  if (callbacks.onPromptStatusChange) {
    socket.on('promptRejected', (data) => {
      console.log('소켓: promptRejected 이벤트 수신', data);
      callbacks.onPromptStatusChange({
        promptId: data.promptId,
        status: 'rejected',
        rejectionReason: data.rejectionReason
      });
    });
    
    socket.on('promptApproved', (data) => {
      console.log('소켓: promptApproved 이벤트 수신', data);
      callbacks.onPromptStatusChange({
        promptId: data.promptId,
        status: 'approved'
      });
    });
  }

  // 이미지 상태 업데이트 이벤트
  if (callbacks.onImageStatusChange) {
    socket.on('imageApproved', (data) => {
      console.log('소켓: imageApproved 이벤트 수신', data);
      callbacks.onImageStatusChange({
        imageId: data.imageId,
        imageUrl: data.imageUrl,
        status: 'approved'
      });
    });
    
    socket.on('imageRejected', (data) => {
      console.log('소켓: imageRejected 이벤트 수신', data);
      callbacks.onImageStatusChange({
        imageId: data.imageId,
        status: 'rejected',
        rejectionReason: data.rejectionReason
      });
    });
  }

  // 새 프롬프트 제출 이벤트 (교사용)
  if (callbacks.onNewPromptSubmitted) {
    socket.on('new_prompt_submitted', (data) => {
      console.log('소켓: new_prompt_submitted 이벤트 수신', data);
      callbacks.onNewPromptSubmitted(data);
    });
  }

  // 새 이미지 생성 이벤트 (교사용)
  if (callbacks.onImageGenerated) {
    socket.on('imageGenerated', (data) => {
      console.log('소켓: imageGenerated 이벤트 수신', data);
      callbacks.onImageGenerated(data);
    });
  }

  return () => {
    socket.off('promptRejected');
    socket.off('promptApproved');
    socket.off('imageApproved');
    socket.off('imageRejected');
    socket.off('new_prompt_submitted');
    socket.off('imageGenerated');
  };
}; 