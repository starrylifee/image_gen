import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
`;

const LoginForm = styled.form`
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 24px;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Button = styled.button`
  width: 100%;
  background-color: #4285f4;
  color: white;
  font-size: 16px;
  padding: 12px;
  margin-top: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #3574e2;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #f44336;
  margin-top: 8px;
  text-align: center;
`;

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('로그인 시도:', { username, password });
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      console.log('서버 응답:', response.data);

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // 사용자 역할에 따라 적절한 페이지로 리다이렉트
      switch (user.role) {
        case 'student':
          navigate('/student');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          setError('알 수 없는 사용자 역할입니다');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      
      if (error.response) {
        console.error('오류 응답:', error.response.data);
        setError(error.response.data.message || '로그인 중 오류가 발생했습니다');
      } else if (error.request) {
        console.error('응답 없음:', error.request);
        setError('서버에서 응답이 없습니다. 네트워크 연결을 확인하세요.');
      } else {
        console.error('요청 설정 오류:', error.message);
        setError('요청 설정 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginForm onSubmit={handleSubmit}>
        <Title>이미지 생성 승인 시스템</Title>
        <Input
          type="text"
          placeholder="사용자 이름"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </LoginForm>
    </LoginContainer>
  );
}

export default LoginPage; 