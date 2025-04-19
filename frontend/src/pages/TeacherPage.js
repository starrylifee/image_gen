import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import io from 'socket.io-client';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin-bottom: 24px;
  color: #333;
`;

const Section = styled.section`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const Card = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #dee2e6;
`;

const ImageContainer = styled.div`
  margin-top: 16px;
  text-align: center;

  img {
    max-width: 100%;
    border-radius: 4px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button`
  flex: 1;
  padding: 8px;
  color: white;
  
  &.approve {
    background-color: #4caf50;
  }
  
  &.reject {
    background-color: #f44336;
  }
`;

function TeacherPage() {
  const [pendingPrompts, setPendingPrompts] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('newPromptSubmission', () => {
      fetchPendingPrompts();
    });

    socket.on('newImageGenerated', () => {
      fetchPendingImages();
    });

    fetchPendingPrompts();
    fetchPendingImages();

    return () => socket.disconnect();
  }, []);

  const fetchPendingPrompts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/teacher/pending-prompts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingPrompts(response.data.prompts);
    } catch (error) {
      console.error('프롬프트 로딩 오류:', error);
      setError('프롬프트를 불러오는 중 오류가 발생했습니다');
    }
  };

  const fetchPendingImages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/teacher/pending-images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingImages(response.data.images);
    } catch (error) {
      console.error('이미지 로딩 오류:', error);
      setError('이미지를 불러오는 중 오류가 발생했습니다');
    }
  };

  const handlePromptAction = async (promptId, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/teacher/process-prompt',
        { promptId, action, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingPrompts();
    } catch (error) {
      console.error('프롬프트 처리 오류:', error);
      setError('프롬프트 처리 중 오류가 발생했습니다');
    }
  };

  const handleImageAction = async (imageId, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/teacher/process-image',
        { imageId, action, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingImages();
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      setError('이미지 처리 중 오류가 발생했습니다');
    }
  };

  return (
    <PageContainer>
      <Title>교사 관리 페이지</Title>
      
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

      <Section>
        <h2>대기 중인 프롬프트</h2>
        <Grid>
          {pendingPrompts.map(prompt => (
            <Card key={prompt._id}>
              <h3>학생: {prompt.student.name}</h3>
              <p>{prompt.content}</p>
              <ButtonGroup>
                <Button
                  className="approve"
                  onClick={() => handlePromptAction(prompt._id, 'approve')}
                >
                  승인
                </Button>
                <Button
                  className="reject"
                  onClick={() => handlePromptAction(prompt._id, 'reject', '부적절한 내용')}
                >
                  거부
                </Button>
              </ButtonGroup>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section>
        <h2>대기 중인 이미지</h2>
        <Grid>
          {pendingImages.map(image => (
            <Card key={image._id}>
              <h3>학생: {image.student.name}</h3>
              <p>프롬프트: {image.prompt.content}</p>
              <ImageContainer>
                <img
                  src={`http://localhost:5000/${image.path}`}
                  alt="생성된 이미지"
                  className={`${image.safetyLevel}-border`}
                />
              </ImageContainer>
              <ButtonGroup>
                <Button
                  className="approve"
                  onClick={() => handleImageAction(image._id, 'approve')}
                >
                  승인
                </Button>
                <Button
                  className="reject"
                  onClick={() => handleImageAction(image._id, 'reject', '부적절한 이미지')}
                >
                  거부
                </Button>
              </ButtonGroup>
            </Card>
          ))}
        </Grid>
      </Section>
    </PageContainer>
  );
}

export default TeacherPage; 