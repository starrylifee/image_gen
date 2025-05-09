import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import Notification from './components/Notification';
import { authAPI } from './services/api';
import socketService from './services/socketService';
import styled from 'styled-components';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f7fb;
`;

const NavBar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #7c83fd;
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.5rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const NavLink = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;

  &:hover {
    color: #7c83fd;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
  font-size: 0.9rem;
  color: #555;

  span {
    font-weight: 600;
    color: #7c83fd;
    margin-left: 0.3rem;
  }
`;

const NotificationContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
`;

function App() {
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 사용자 인증 상태 확인
    const checkAuthStatus = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          
          // 토큰 유효성 검증
          await authAPI.verify();
          
          // 소켓 연결
          socketService.connect();
        }
      } catch (err) {
        console.error('인증 오류:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // 초기화 시 알림 상태 초기화
    setNotification(null);
    checkAuthStatus();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // 로그아웃 처리
  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    socketService.disconnect();
    showNotification('로그아웃되었습니다.', 'info');
  };

  // 알림 표시
  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Router>
      <AppContainer>
        {user && (
          <NavBar>
            <Logo>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 9.00001C20.7348 9.00001 20.4804 9.10537 20.2929 9.29291C20.1054 9.48044 20 9.73479 20 10V14C20 14.2652 20.1054 14.5196 20.2929 14.7071C20.4804 14.8947 20.7348 15 21 15C21.2652 15 21.5196 14.8947 21.7071 14.7071C21.8946 14.5196 22 14.2652 22 14V10C22 9.73479 21.8946 9.48044 21.7071 9.29291C21.5196 9.10537 21.2652 9.00001 21 9.00001ZM17 6.00001H17.42C16.2575 4.81328 14.671 4.15121 13 4.15121C11.329 4.15121 9.74256 4.81328 8.58 6.00001H9C9.79561 6.00001 10.5587 6.31608 11.1213 6.87869C11.6839 7.4413 12 8.2044 12 9.00001V15C12 15.7957 11.6839 16.5587 11.1213 17.1213C10.5587 17.684 9.79561 18 9 18H5C4.20435 18 3.44129 17.684 2.87868 17.1213C2.31607 16.5587 2 15.7957 2 15V9.00001C2 8.2044 2.31607 7.4413 2.87868 6.87869C3.44129 6.31608 4.20435 6.00001 5 6.00001H5.42C4.28342 7.1785 3.61553 8.74062 3.51862 10.3799C3.42172 12.0192 3.90039 13.6413 4.86756 14.9956C5.83473 16.35 7.23466 17.3561 8.83452 17.8581C10.4344 18.3601 12.1499 18.3309 13.731 17.7747C15.3122 17.2185 16.6779 16.1702 17.5953 14.7823C18.5127 13.3944 18.9328 11.7437 18.7862 10.0972C18.6396 8.45059 17.9344 6.90019 16.78 5.70001C16.8549 5.79518 16.9154 5.90131 16.9593 6.01499C17.0032 6.12868 17.0299 6.24848 17.0385 6.37062C17.047 6.49276 17.0371 6.61536 17.0093 6.73371C16.9815 6.85207 16.9362 6.96414 16.8753 7.06552C16.8145 7.16691 16.7392 7.25605 16.6527 7.32911C16.5663 7.40217 16.4702 7.4581 16.3685 7.49429C16.2667 7.53049 16.1608 7.54642 16.0551 7.54139C15.9494 7.53636 15.8453 7.51044 15.7481 7.46487C15.6509 7.41929 15.5624 7.35481 15.487 7.27418C15.267 7.04242 15.0056 6.86054 14.7176 6.73908C14.4296 6.61763 14.1207 6.55914 13.8094 6.56701C13.4981 6.57488 13.1927 6.6489 12.9121 6.7847C12.6316 6.92051 12.38 7.11524 12.1719 7.35657C11.9638 7.5979 11.8036 7.88055 11.7015 8.18695C11.5994 8.49334 11.5579 8.8168 11.5794 9.1391C11.6009 9.46141 11.6852 9.77642 11.8274 10.0634C11.9696 10.3503 12.1668 10.6031 12.407 10.806C12.3322 10.7108 12.2717 10.6047 12.2277 10.491C12.1838 10.3773 12.1571 10.2575 12.1486 10.1354C12.14 10.0132 12.1499 9.89063 12.1777 9.77227C12.2055 9.65392 12.2508 9.54185 12.3117 9.44046C12.3725 9.33908 12.4478 9.24994 12.5342 9.17688C12.6207 9.10382 12.7168 9.04789 12.8185 9.01169C12.9203 8.9755 13.0262 8.95957 13.1319 8.9646C13.2376 8.96963 13.3417 8.99555 13.4389 9.04112C13.5361 9.08669 13.6246 9.15118 13.7 9.23181C13.92 9.46357 14.1814 9.64545 14.4694 9.7669C14.7574 9.88836 15.0663 9.94684 15.3776 9.93898C15.6889 9.93111 15.9943 9.85708 16.2749 9.72128C16.5554 9.58547 16.807 9.39075 17.0151 9.14942C17.2232 8.90809 17.3834 8.62544 17.4855 8.31904C17.5876 8.01264 17.6291 7.68919 17.6076 7.36688C17.5861 7.04457 17.5018 6.72957 17.3596 6.44258C17.2174 6.15559 17.0202 5.90287 16.78 5.70001C16.8546 5.79538 16.9149 5.90165 16.9586 6.01539C17.0023 6.12913 17.0289 6.24894 17.0373 6.37107C17.0457 6.4932 17.0357 6.61576 17.0079 6.73408C16.98 6.85239 16.9348 6.96443 16.8739 7.06578C16.8131 7.16714 16.7379 7.25627 16.6515 7.32934C16.5651 7.4024 16.469 7.45834 16.3674 7.49457C16.2657 7.5308 16.1598 7.54679 16.0541 7.54182C15.9484 7.53686 15.8443 7.51102 15.7471 7.46553C15.6498 7.42004 15.5613 7.35564 15.486 7.27508C15.266 7.04331 15.0045 6.86144 14.7165 6.73998C14.4285 6.61853 14.1196 6.56004 13.8083 6.56791C13.497 6.57578 13.1916 6.6498 12.911 6.7856C12.6305 6.92141 12.3789 7.11614 12.1708 7.35747C11.9627 7.5988 11.8025 7.88145 11.7004 8.18785C11.5983 8.49424 11.5568 8.8177 11.5783 9.14001C11.5998 9.46232 11.6841 9.77732 11.8263 10.0643C11.9685 10.3513 12.1657 10.604 12.406 10.807C12.3312 10.7117 12.2707 10.6056 12.2268 10.4919C12.1828 10.3782 12.1561 10.2584 12.1476 10.1363C12.139 10.0142 12.1489 9.89159 12.1768 9.77323C12.2046 9.65487 12.2498 9.54281 12.3107 9.44143C12.3716 9.34004 12.4469 9.2509 12.5333 9.17784C12.6198 9.10478 12.7159 9.04886 12.8176 9.01266C12.9194 8.97646 13.0253 8.96053 13.131 8.96556C13.2367 8.97059 13.3408 8.99651 13.438 9.04208C13.5352 9.08766 13.6237 9.15214 13.699 9.23278C13.919 9.46454 14.1805 9.64641 14.4685 9.76787C14.7565 9.88932 15.0654 9.9478 15.3767 9.93994C15.688 9.93207 15.9934 9.85804 16.274 9.72224C16.5545 9.58644 16.8061 9.39171 17.0142 9.15038C17.2223 8.90905 17.3825 8.6264 17.4846 8.32C17.5867 8.01361 17.6282 7.69015 17.6067 7.36784C17.5852 7.04553 17.5009 6.73053 17.3587 6.44354C17.2165 6.15656 17.0193 5.90384 16.779 5.70097L17 6.00001Z" fill="#7c83fd"/>
              </svg>
              이미지 생성 시스템
            </Logo>
            <NavLinks>
              <UserInfo>
                로그인 ID: <span>{user.name || user.email}</span>
              </UserInfo>
              <NavLink onClick={handleLogout}>로그아웃</NavLink>
            </NavLinks>
          </NavBar>
        )}
        
        <Routes>
          <Route path="/login" element={user ? <Navigate to={getHomePage(user)} /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={getHomePage(user)} /> : <Register />} />
          <Route path="/student" element={
            <ProtectedRoute requiredRole="student">
              <Student />
            </ProtectedRoute>
          } />
          <Route path="/teacher" element={
            <ProtectedRoute requiredRole="teacher">
              <Teacher />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/" element={user ? <Navigate to={getHomePage(user)} /> : <Navigate to="/login" />} />
        </Routes>
        
        {notification && notification.message && (
          <NotificationContainer>
            <Notification 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification(null)} 
            />
          </NotificationContainer>
        )}
      </AppContainer>
    </Router>
  );
}

// 사용자 역할에 따른 홈페이지 반환
function getHomePage(user) {
  if (!user) return '/login';
  
  switch(user.role) {
    case 'student': return '/student';
    case 'teacher': return '/teacher';
    case 'admin': return '/admin';
    default: return '/login';
  }
}

export default App; 