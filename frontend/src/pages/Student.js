import React, { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import socketService from '../services/socketService';
import styled from 'styled-components';
import { setupSocketListeners } from '../services/api';
import Notification from '../components/Notification';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.header`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 0.5rem;
`;

const SubTitle = styled.p`
  color: #666;
  font-size: 1.1rem;
`;

const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.section`
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const TextArea = styled.textarea`
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  min-height: 150px;
  resize: vertical;
  margin-bottom: 1rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #7c83fd;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
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

  &:disabled {
    background-color: #b5b8ff;
    cursor: not-allowed;
  }
`;

const StatusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatusItem = styled.div`
  padding: 1rem;
  border-radius: 5px;
  background-color: #f5f7fb;
  border-left: 4px solid ${props => {
    switch(props.status) {
      case 'approved': return '#2ecc71';
      case 'rejected': return '#e74c3c';
      case 'processed': return '#3498db';
      default: return '#f39c12';
    }
  }};
`;

const StatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StatusTitle = styled.h3`
  font-size: 1rem;
  color: #333;
  margin: 0;
`;

const StatusBadge = styled.span`
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  background-color: ${props => {
    switch(props.status) {
      case 'approved': return '#2ecc71';
      case 'rejected': return '#e74c3c';
      case 'processed': return '#3498db';
      default: return '#f39c12';
    }
  }};
`;

const StatusContent = styled.p`
  margin: 0.5rem 0;
  color: #555;
  font-size: 0.95rem;
`;

const StatusDate = styled.p`
  margin: 0;
  color: #888;
  font-size: 0.8rem;
  text-align: right;
`;

const RejectionReason = styled.p`
  margin: 0.5rem 0;
  color: #e74c3c;
  font-size: 0.9rem;
  font-style: italic;
`;

const EmptyStatus = styled.div`
  text-align: center;
  padding: 2rem;
  color: #888;
  font-style: italic;
`;

const ImagePreview = styled.div`
  margin-top: 1rem;
  text-align: center;
`;

const Image = styled.img`
  max-width: 100%;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ApprovedImage = styled.img`
  max-width: 100%;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// 다운로드 버튼 스타일 컴포넌트 추가
const DownloadButton = styled.button`
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #45a049;
  }
  
  svg {
    margin-right: 6px;
  }
`;

// 날짜 포맷 유틸리티 함수 추가
const formatDate = (dateString) => {
  if (!dateString) return '날짜 정보 없음';
  
  try {
    return new Date(dateString).toLocaleString();
  } catch (err) {
    console.error('날짜 변환 오류:', err);
    return dateString || '날짜 정보 없음';
  }
};

// 이미지 다운로드 함수
const downloadImage = (imageUrl, imageName) => {
  console.log('이미지 다운로드 시도:', imageUrl);
  
  // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
  const fullImageUrl = imageUrl.startsWith('http') 
    ? imageUrl 
    : `${window.location.protocol}//${window.location.hostname}:5000${imageUrl}`;
  
  console.log('실제 요청 URL:', fullImageUrl);
  
  // 파일 이름 설정
  const fileName = imageName || `이미지_${new Date().getTime()}.png`;
  
  // fetch로 이미지 가져오기
  fetch(fullImageUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // 링크 클릭하여 다운로드 시작
      document.body.appendChild(link);
      link.click();
      
      // 링크 제거
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    })
    .catch(error => {
      console.error('이미지 다운로드 오류:', error);
      alert('이미지 다운로드 중 오류가 발생했습니다: ' + error.message);
    });
};

const Student = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingPrompts, setPendingPrompts] = useState([]);
  const [approvedImages, setApprovedImages] = useState([]);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  // 학생 상태 조회
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await studentAPI.getStatus();
      console.log('상태 응답 데이터:', data);
      
      // 서버에서 반환된 데이터로 상태 업데이트
      if (data.pendingPrompt) {
        setPendingPrompts([{
          content: data.pendingPrompt,
          id: data.pendingPromptId,
          status: data.pendingPromptStatus,
          createdAt: new Date().toISOString()
        }]);
      } else if (data.pendingPrompts && data.pendingPrompts.length > 0) {
        // 진행 중인 프롬프트만 pendingPrompts에 설정
        const onlyPendingPrompts = data.pendingPrompts.filter(
          prompt => prompt.status === 'pending'
        );
        setPendingPrompts(onlyPendingPrompts);
      } else {
        setPendingPrompts([]);
      }
      
      // 승인된 이미지 처리
      if (data.approvedImages && data.approvedImages.length > 0) {
        console.log('승인된 이미지 배열:', data.approvedImages);
        setApprovedImages(data.approvedImages);
      } else if (data.approvedImage) {
        console.log('승인된 이미지 있음:', data.approvedImage);
        setApprovedImages([{
          path: data.approvedImage,
          url: data.approvedImage,
          createdAt: new Date().toISOString()
        }]);
      } else {
        setApprovedImages([]);
      }

      console.log('설정된 승인 이미지:', approvedImages);
    } catch (err) {
      setError('상태 정보를 불러오는 데 실패했습니다.');
      console.error('상태 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 소켓 연결 및 이벤트 리스너 설정
    const socket = socketService.connect();
    
    console.log('학생 화면: 소켓 연결 설정 완료');
    
    const cleanup = setupSocketListeners(socket, {
      onPromptStatusChange: (data) => {
        console.log('프롬프트 상태 변경 이벤트:', data);
        if (data.promptId && data.status === 'rejected') {
          setNotification({
            show: true,
            message: `프롬프트가 거부되었습니다: ${data.rejectionReason || '이유가 제공되지 않았습니다'}`,
            type: 'error'
          });
          // 상태 새로고침
          fetchStatus();
        } else if (data.promptId && data.status === 'approved') {
          setNotification({
            show: true,
            message: '프롬프트가 승인되었습니다. 곧 이미지가 생성됩니다.',
            type: 'success'
          });
        } else if (data.promptId && data.status === 'processed') {
          setNotification({
            show: true,
            message: data.message || '프롬프트 처리가 완료되었습니다.',
            type: 'info'
          });
          // 상태 새로고침
          fetchStatus();
        }
      },
      onImageStatusChange: (data) => {
        console.log('이미지 상태 변경 이벤트:', data);
        if (data.imageId) {
          if (data.status === 'approved') {
            // 이미지가 승인되면 즉시 승인된 이미지 목록에 추가
            const newImage = {
              _id: data.imageId,
              path: data.imageUrl,
              isExternalUrl: data.imageUrl.startsWith('http'),
              createdAt: new Date().toISOString()
            };
            
            setApprovedImages(prev => [newImage, ...prev]);
            
            // 프롬프트 상태 정리 - 승인된 이미지에 해당되는 프롬프트를 목록에서 제거
            setPendingPrompts(prev => {
              const remainingPrompts = prev.filter(prompt => {
                // 프롬프트 ID가 있으면 ID로 필터링, 없으면 상태로 필터링
                if (prompt._id && data.promptId) {
                  return prompt._id !== data.promptId;
                } else {
                  return prompt.status !== 'approved' && prompt.status !== 'processed';
                }
              });
              return remainingPrompts;
            });
            
            setNotification({
              show: true,
              message: '이미지가 승인되었습니다!',
              type: 'success'
            });
            
            // 알림을 5초 후에 자동으로 닫기
            setTimeout(() => {
              setNotification(prev => ({ ...prev, show: false }));
            }, 5000);
          } else if (data.status === 'rejected') {
            setNotification({
              show: true,
              message: `이미지가 거부되었습니다: ${data.rejectionReason || '이유가 제공되지 않았습니다'}`,
              type: 'error'
            });
            // 상태 새로고침
            fetchStatus();
          }
        }
      }
    });
    
    // 초기 데이터 로드
    fetchStatus();
    
    return () => {
      cleanup && cleanup();
      socketService.disconnect();
    };
  }, []); // 의존성 목록 비움 (컴포넌트 마운트 시 한 번만 실행)

  // 프롬프트 제출
  const handleSubmitPrompt = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await studentAPI.submitPrompt(prompt);
      setSuccessMessage('프롬프트가 성공적으로 제출되었습니다! 교사의 승인을 기다리고 있습니다.');
      setPrompt('');
      fetchStatus();
    } catch (err) {
      setError(err.message || '프롬프트 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 상태 배지 텍스트 변환
  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return '대기 중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      case 'processed': return '처리됨';
      default: return status;
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>학생 대시보드</Title>
        <SubTitle>이미지 생성을 위한 프롬프트를 제출하고 진행 상황을 확인하세요.</SubTitle>
      </Header>
      
      <ContentWrapper>
        <Section>
          <SectionTitle>프롬프트 제출</SectionTitle>
          <Form onSubmit={handleSubmitPrompt}>
            <TextArea
              placeholder="생성하고 싶은 이미지에 대한 자세한 설명을 입력하세요..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
            {error && <RejectionReason>{error}</RejectionReason>}
            {successMessage && (
              <StatusContent style={{ color: '#2ecc71' }}>{successMessage}</StatusContent>
            )}
            <Button type="submit" disabled={submitting || loading || pendingPrompts.some(p => p.status === 'pending')}>
              {submitting ? '제출 중...' : pendingPrompts.some(p => p.status === 'pending') ? '처리 중인 프롬프트가 있습니다' : '프롬프트 제출'}
            </Button>
          </Form>
        </Section>
        
        <Section>
          <SectionTitle>상태</SectionTitle>
          {loading ? (
            <EmptyStatus>로딩 중...</EmptyStatus>
          ) : (
            <StatusList>
              {pendingPrompts.length === 0 && approvedImages.length === 0 ? (
                <EmptyStatus>아직 제출한 프롬프트가 없습니다.</EmptyStatus>
              ) : (
                <>
                  {pendingPrompts.map((item) => (
                    <StatusItem key={item._id} status={item.status}>
                      <StatusHeader>
                        <StatusTitle>프롬프트</StatusTitle>
                        <StatusBadge status={item.status}>
                          {getStatusText(item.status)}
                        </StatusBadge>
                      </StatusHeader>
                      <StatusContent>{item.content}</StatusContent>
                      {item.rejectionReason && (
                        <RejectionReason>거부 사유: {item.rejectionReason}</RejectionReason>
                      )}
                      <StatusDate>
                        {formatDate(item.createdAt)}
                      </StatusDate>
                    </StatusItem>
                  ))}
                  
                  {approvedImages.length > 0 ? (
                    <StatusList>
                      {approvedImages.map((item, index) => (
                        <StatusItem key={index}>
                          <StatusHeader>
                            <StatusTitle>승인된 이미지</StatusTitle>
                            <StatusDate>
                              {formatDate(item.createdAt)}
                            </StatusDate>
                          </StatusHeader>
                          <ImagePreview>
                            {item.path || item.url ? (
                              <>
                                <ApprovedImage 
                                  src={item.isExternalUrl 
                                    ? item.path // 외부 URL은 그대로 사용
                                    : (item.path || item.url).startsWith('http') 
                                      ? (item.path || item.url) 
                                      : `${window.location.protocol}//${window.location.hostname}:5000${item.path || item.url}`} 
                                  alt="승인된 이미지" 
                                  onError={(e) => {
                                    console.error('이미지 로드 실패:', e);
                                    e.target.src = 'https://via.placeholder.com/400x300?text=이미지+로드+실패';
                                  }}
                                />
                                <DownloadButton
                                  onClick={() => downloadImage(item.path || item.url, `생성된_이미지_${formatDate(item.createdAt).replace(/[:\s]/g, '_')}.png`)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 12L3 7L4.4 5.55L7 8.15V1H9V8.15L11.6 5.55L13 7L8 12Z" fill="currentColor"/>
                                    <path d="M2 14V11H4V13H12V11H14V14H2Z" fill="currentColor"/>
                                  </svg>
                                  다운로드
                                </DownloadButton>
                              </>
                            ) : (
                              <p>이미지를 불러올 수 없습니다</p>
                            )}
                          </ImagePreview>
                        </StatusItem>
                      ))}
                    </StatusList>
                  ) : (
                    <EmptyStatus>승인된 이미지가 없습니다.</EmptyStatus>
                  )}
                </>
              )}
            </StatusList>
          )}
        </Section>
      </ContentWrapper>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </PageContainer>
  );
};

export default Student; 