import React from 'react';
import styled from 'styled-components';

// 스타일링된 컴포넌트
const PromptForm = styled.form`
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const PromptLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 1.1rem;
`;

const PromptTextArea = styled.textarea`
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-bottom: 1rem;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #4285f4;
  }
`;

const SubmitButton = styled.button`
  background-color: #4285f4;
  color: white;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3367d6;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const HelperText = styled.p`
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.9rem;
`;

export const PromptInput = ({ value, onChange, onSubmit }) => {
  return (
    <PromptForm onSubmit={onSubmit}>
      <PromptLabel htmlFor="prompt-input">이미지 생성을 위한 프롬프트 입력</PromptLabel>
      <PromptTextArea
        id="prompt-input"
        value={value}
        onChange={onChange}
        placeholder="원하는 이미지에 대한 설명을 입력해주세요. 예: '푸른 하늘 아래 꽃이 피어있는 초원'"
        required
      />
      <SubmitButton type="submit" disabled={!value.trim()}>
        프롬프트 제출
      </SubmitButton>
      <HelperText>
        * 입력하신 프롬프트는 교사의 검토 후 이미지 생성이 진행됩니다.
      </HelperText>
    </PromptForm>
  );
}; 