import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import io from 'socket.io-client';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin-bottom: 24px;
  color: #333;
`;

const PromptForm = styled.form`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const TextArea = styled.textarea`
  height: 100px;
  resize: vertical;
`;

const Button = styled.button`
  background-color: #4285f4;
  color: white;
  width: 100%;
`;

const StatusSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ImageContainer = styled.div`
  margin-top: 20px;
  text-align: center;

  img {
    max-width: 100%;
    border-radius: 4px;
  }
`;

function StudentPage() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:5000');
    const user = JSON.parse(localStorage.getItem('user'));

    socket.on('promptStatusUpdate', (data) => {
      if (data.studentId === user._id) {
        checkStatus();
      }
    });

    checkStatus();

    return () => socket.disconnect();
  }, []);

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/student/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (error) {
      console.error('상태 확인 오류:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/student/submit-prompt',
        { content: prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrompt('');
      checkStatus();
    } catch (error) {
      setError(error.response?.data?.message || '프롬프트 제출 중 오류가 발생했습니다');
    }
  };

  return (
    <PageContainer>
      <Title>프롬프트 제출</Title>
      <PromptForm onSubmit={handleSubmit}>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="생성하고 싶은 이미지를 설명해주세요..."
          required
        />
        <Button type="submit">제출</Button>
        {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}
      </PromptForm>

      <StatusSection>
        <h2>현재 상태</h2>
        {status?.pendingPrompt && (
          <div>
            <h3>대기 중인 프롬프트</h3>
            <p>{status.pendingPrompt.content}</p>
          </div>
        )}
        {status?.approvedImage && (
          <div>
            <h3>승인된 이미지</h3>
            <ImageContainer>
              <img
                src={`${status.approvedImage.path}`}
                alt="생성된 이미지"
                className={`${status.approvedImage.safetyLevel}-border`}
              />
            </ImageContainer>
          </div>
        )}
      </StatusSection>
    </PageContainer>
  );
}

export default StudentPage; 