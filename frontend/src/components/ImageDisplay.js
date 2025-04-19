import React from 'react';
import styled from 'styled-components';

// 스타일링된 컴포넌트
const ImageContainer = styled.div`
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 500px;
  border-radius: 4px;
  
  &.green-border {
    border: 3px solid #4caf50;
  }
  
  &.yellow-border {
    border: 3px solid #ffeb3b;
  }
  
  &.red-border {
    border: 3px solid #f44336;
  }
`;

const Caption = styled.p`
  margin-top: 1rem;
  color: #333;
  font-size: 0.9rem;
`;

export const ImageDisplay = ({ imageUrl, safetyLevel, showSafetyBorder = false, caption }) => {
  // 안전성 수준에 따른 클래스 결정
  let borderClass = '';
  if (showSafetyBorder && safetyLevel) {
    switch (safetyLevel) {
      case 'safe':
        borderClass = 'green-border';
        break;
      case 'moderate':
        borderClass = 'yellow-border';
        break;
      case 'unsafe':
        borderClass = 'red-border';
        break;
      default:
        borderClass = '';
    }
  }

  return (
    <ImageContainer>
      <Image 
        src={imageUrl} 
        alt="생성된 이미지" 
        className={borderClass}
      />
      {caption && <Caption>{caption}</Caption>}
    </ImageContainer>
  );
}; 