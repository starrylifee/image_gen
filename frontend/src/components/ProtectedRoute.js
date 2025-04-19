import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #7c83fd;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #666;
  font-size: 1.2rem;
`;

const UnauthorizedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  padding: 2rem;
  text-align: center;
`;

const UnauthorizedTitle = styled.h2`
  color: #e74c3c;
  margin-bottom: 1rem;
`;

const UnauthorizedMessage = styled.p`
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  max-width: 600px;
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #7c83fd;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #4e54c8;
  }
`;

const ProtectedRoute = ({ children, requiredRole }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        // 토큰 검증
        const response = await authAPI.verify();
        const userData = response.user || JSON.parse(localStorage.getItem('user'));
        setUser(userData);
        setIsAuthenticated(true);
        
        // 권한 확인
        if (requiredRole && userData) {
          // 'admin' 역할은 모든 페이지에 접근 가능
          if (userData.role === 'admin' || userData.role === requiredRole) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(true); // 특정 역할이 필요하지 않은 경우
        }
      } catch (err) {
        console.error('인증 오류:', err);
        setIsAuthenticated(false);
        setIsAuthorized(false);
        // 인증 오류 시 토큰 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [requiredRole]);

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>인증 확인 중...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isAuthorized) {
    return (
      <UnauthorizedContainer>
        <UnauthorizedTitle>접근 권한이 없습니다</UnauthorizedTitle>
        <UnauthorizedMessage>
          이 페이지에 접근하기 위한 권한이 없습니다. 다른 계정으로 로그인하거나
          관리자에게 문의하세요.
        </UnauthorizedMessage>
        <BackButton onClick={() => window.history.back()}>뒤로 가기</BackButton>
      </UnauthorizedContainer>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 