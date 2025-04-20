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

    // 프롬프트 상태 업데이트 이벤트
    socket.on('promptStatusUpdate', (data) => {
      if (data.studentId === user._id) {
        checkStatus();
      }
    });
    
    // 이미지 승인 이벤트
    socket.on('imageApproved', (data) => {
      if (data.studentId === user._id) {
        console.log('이미지가 승인되었습니다:', data);
        checkStatus();
      }
    });
    
    // 이미지 생성 이벤트
    socket.on('imageGenerated', (data) => {
      if (data.student._id === user._id) {
        console.log('새 이미지가 생성되었습니다:', data);
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
      console.log('학생 상태 데이터:', response.data);
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

  // 승인된 이미지 목록 렌더링
  const renderApprovedImages = () => {
    if (!status || !status.approvedImages || status.approvedImages.length === 0) {
      return <p>승인된 이미지가 없습니다.</p>;
    }

    return status.approvedImages.map((image) => (
      <div key={image._id}>
        <h3>승인된 이미지</h3>
        <p>{image.prompt?.content || '프롬프트 정보 없음'}</p>
        <ImageContainer>
          {/* 외부 URL과 내부 경로 구분 처리 */}
          <img
            src={image.isExternalUrl ? image.displayUrl : `http://localhost:5000${image.path}`}
            alt="생성된 이미지"
            className={`${image.safetyLevel || 'safe'}-border`}
          />
        </ImageContainer>
      </div>
    ));
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
        {status?.pendingPrompts && status.pendingPrompts.length > 0 && (
          <div>
            <h3>대기 중인 프롬프트</h3>
            <p>{status.pendingPrompts[0].content}</p>
            <p style={{ color: 'gray' }}>상태: {status.pendingPrompts[0].status}</p>
          </div>
        )}
        
        {/* 승인된 이미지 목록 */}
        {renderApprovedImages()}
      </StatusSection>
    </PageContainer>
  );
}

export default StudentPage; 