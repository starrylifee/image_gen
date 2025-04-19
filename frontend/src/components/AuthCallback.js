import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f7fb;
`;

const Card = styled.div`
  padding: 2rem;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
  color: #333;
`;

const Message = styled.p`
  margin-bottom: 1rem;
  color: #666;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #7c83fd;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const AuthCallback = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processToken = async () => {
      try {
        // URL에서 토큰 추출
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');

        if (!token) {
          setError('토큰이 없습니다. 로그인을 다시 시도해주세요.');
          setLoading(false);
          return;
        }

        // 토큰 저장
        localStorage.setItem('token', token);

        // 사용자 정보 가져오기
        const response = await fetch('http://localhost:5000/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('사용자 정보를 가져오는데 실패했습니다.');
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));

        // 역할에 따라 리다이렉트
        setTimeout(() => {
          if (data.user.role === 'teacher') {
            navigate('/teacher');
          } else if (data.user.role === 'student') {
            navigate('/student');
          } else if (data.user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);
      } catch (error) {
        console.error('인증 콜백 오류:', error);
        setError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        setLoading(false);
      }
    };

    processToken();
  }, [location, navigate]);

  return (
    <Container>
      <Card>
        <Title>인증 처리 중</Title>
        {loading ? (
          <>
            <LoadingSpinner />
            <Message>Google 로그인을 처리하고 있습니다. 잠시만 기다려주세요...</Message>
          </>
        ) : (
          <Message>{error || '인증이 완료되었습니다. 리다이렉트 중...'}</Message>
        )}
      </Card>
    </Container>
  );
};

export default AuthCallback; 