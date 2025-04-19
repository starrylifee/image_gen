import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// 스타일링된 컴포넌트
const NotificationContainer = styled.div`
  width: 300px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transform: translateY(0);
  opacity: 1;
  transition: opacity 0.3s, transform 0.3s;
  animation: slideIn 0.3s ease-out;
  background-color: ${props => {
    switch (props.type) {
      case 'success': return '#e8f5e9';
      case 'warning': return '#fff8e1';
      case 'error': return '#ffebee';
      default: return '#e3f2fd';
    }
  }};

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const NotificationMessage = styled.div`
  flex: 1;
  color: ${props => {
    switch (props.type) {
      case 'success': return '#2e7d32';
      case 'warning': return '#f57f17';
      case 'error': return '#c62828';
      default: return '#1565c0';
    }
  }};
  font-size: 0.9rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 1.2rem;
  margin-left: 0.5rem;
  padding: 0;
  
  &:hover {
    color: #666;
  }
`;

const Notification = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 300); // 애니메이션 후 닫기
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) setTimeout(onClose, 300); // 애니메이션 후 닫기
  };

  return (
    <NotificationContainer
      type={type}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)'
      }}
    >
      <NotificationMessage type={type}>{message}</NotificationMessage>
      <CloseButton onClick={handleClose}>×</CloseButton>
    </NotificationContainer>
  );
};

export default Notification; 