import React, { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';             // API 호출 모듈
import socketService from '../services/socketService';    // 소켓 연결 서비스
import styled from 'styled-components';                    // 스타일 컴포넌트
import { setupSocketListeners } from '../services/api';    // 소켓 이벤트 리스너 셋업
import Notification from '../components/Notification';      // 토스트 알림 컴포넌트

// 페이지 최상단 컨테이너: 중앙 정렬 및 패딩 설정
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

// 헤더 섹션 스타일
const Header = styled.header`
  margin-bottom: 2rem;
`;

// 메인 타이틀 스타일
const Title = styled.h1`
  color: #333;
  margin-bottom: 0.5rem;
`;

// 서브타이틀 스타일
const SubTitle = styled.p`
  color: #666;
  font-size: 1.1rem;
`;

// 두 개의 컬럼 레이아웃 (모바일에서는 1열)
const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// 섹션 박스 스타일
const Section = styled.section`
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
`;

// 섹션 제목 스타일
const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
`;

// 폼 기본 스타일
const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

// 텍스트에어리어 스타일
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

// 버튼 기본 스타일
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
  &:hover { background-color: #4e54c8; }
  &:disabled { background-color: #b5b8ff; cursor: not-allowed; }
`;

// 상태 목록 컨테이너
const StatusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// 개별 상태 아이템 스타일
const StatusItem = styled.div`
  padding: 1rem;
  border-radius: 5px;
  background-color: #f5f7fb;
  border-left: 4px solid ${props => {
    // 상태에 따라 왼쪽 색 변경
    switch(props.status) {
      case 'approved': return '#2ecc71';
      case 'rejected': return '#e74c3c';
      case 'processed': return '#3498db';
      default: return '#f39c12';
    }
  }};
`;

// 상태 헤더 (제목 + 배지)
const StatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

// 상태 제목 스타일
const StatusTitle = styled.h3`
  font-size: 1rem;
  color: #333;
  margin: 0;
`;

// 상태 배지 스타일
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

// 상태 내용 텍스트
const StatusContent = styled.p`
  margin: 0.5rem 0;
  color: #555;
  font-size: 0.95rem;
`;

// 날짜 텍스트
const StatusDate = styled.p`
  margin: 0;
  color: #888;
  font-size: 0.8rem;
  text-align: right;
`;

// 거부 사유 스타일
const RejectionReason = styled.p`
  margin: 0.5rem 0;
  color: #e74c3c;
  font-size: 0.9rem;
  font-style: italic;
`;

// 빈 상태 메시지
const EmptyStatus = styled.div`
  text-align: center;
  padding: 2rem;
  color: #888;
  font-style: italic;
`;

// 이미지 미리보기 컨테이너
const ImagePreview = styled.div`
  margin-top: 1rem;
  text-align: center;
`;

// 승인된 이미지 스타일
const ApprovedImage = styled.img`
  max-width: 100%;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// 다운로드 링크를 위한 a 태그 컴포넌트
const DownloadLink = styled.a`
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  &:hover { background-color: #45a049; }
  svg { margin-right: 6px; }
`;

// 날짜 포맷 함수: 문자열 → 현지 시간 문자열
const formatDate = (dateString) => {
  if (!dateString) return '날짜 정보 없음';
  try {
    return new Date(dateString).toLocaleString();
  } catch (err) {
    console.error('날짜 변환 오류:', err);
    return dateString;
  }
};

const Student = () => {
  // 로컬 상태 선언
  const [prompt, setPrompt] = useState('');              // 입력된 프롬프트
  const [loading, setLoading] = useState(false);         // 상태 로딩 플래그
  const [submitting, setSubmitting] = useState(false);   // 제출 중 플래그
  const [error, setError] = useState('');                // 오류 메시지
  const [successMessage, setSuccessMessage] = useState(''); // 성공 메시지
  const [pendingPrompts, setPendingPrompts] = useState([]); // 대기 중 프롬프트 목록
  const [approvedImages, setApprovedImages] = useState([]); // 승인된 이미지 목록
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' }); // 알림 상태

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

  // 컴포넌트 마운트 시 호출
  useEffect(() => {
    const socket = socketService.connect();          // 소켓 연결
    
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
  }, []);

  // 프롬프트 제출 핸들러
  const handleSubmitPrompt = async e => {
    e.preventDefault();                              // 폼 기본 제출 방지
    if (!prompt.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await studentAPI.submitPrompt(prompt);
      setSuccessMessage('프롬프트가 성공적으로 제출되었습니다!');
      setPrompt('');
      fetchStatus();
    } catch (err) {
      setError(err.message || '프롬프트 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 상태 텍스트 매핑
  const getStatusText = status => {
    const map = { pending: '대기 중', approved: '승인됨', rejected: '거부됨', processed: '처리됨' };
    return map[status] || status;
  };

  return (
    <PageContainer>
      <Header>
        <Title>학생 대시보드</Title>
        <SubTitle>프롬프트를 제출하고 이미지 생성 상태를 확인하세요.</SubTitle>
      </Header>

      <ContentWrapper>
        {/* 프롬프트 제출 섹션 */}
        <Section>
          <SectionTitle>프롬프트 제출</SectionTitle>
          <Form onSubmit={handleSubmitPrompt}>
            <TextArea
              placeholder="생성할 이미지를 설명하세요..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              required
            />
            {error && <RejectionReason>{error}</RejectionReason>}
            {successMessage && <StatusContent style={{ color: '#2ecc71' }}>{successMessage}</StatusContent>}
            <Button type="submit" disabled={submitting || loading || pendingPrompts.some(p => p.status==='pending')}> 
              {submitting ? '제출 중...' : '프롬프트 제출'}
            </Button>
          </Form>
        </Section>

        {/* 상태 표시 섹션 */}
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
                  {/* 대기 중 프롬프트 렌더링 */}
                  {pendingPrompts.map(item => (
                    <StatusItem key={item._id || item.id} status={item.status}>
                      <StatusHeader>
                        <StatusTitle>프롬프트</StatusTitle>
                        <StatusBadge status={item.status}>{getStatusText(item.status)}</StatusBadge>
                      </StatusHeader>
                      <StatusContent>{item.content}</StatusContent>
                      {item.rejectionReason && (
                        <RejectionReason>거부 사유: {item.rejectionReason}</RejectionReason>
                      )}
                      <StatusDate>{formatDate(item.createdAt)}</StatusDate>
                    </StatusItem>
                  ))}

                  {/* 승인된 이미지 렌더링 */}
                  {approvedImages.length > 0 ? (
                    approvedImages.map((item, idx) => {
                      // URL 조합: 외부 URL 여부 확인
                      const url = item.isExternalUrl ?
                        item.path :
                        (item.path.startsWith('/uploads') ? item.path : `/uploads/${item.path}`);
                      const fileName = `image_${item._id||idx}.png`;

                      return (
                        <StatusItem key={idx} status="approved">
                          <StatusHeader>
                            <StatusTitle>승인된 이미지</StatusTitle>
                            <StatusDate>{formatDate(item.createdAt)}</StatusDate>
                          </StatusHeader>
                          <ImagePreview>
                            <ApprovedImage src={url} alt="승인된 이미지"
                              onError={(e) => {
                                console.error('이미지 로드 실패:', e);
                                e.target.src = 'https://via.placeholder.com/400x300?text=이미지+로드+실패';
                              }}
                            />
                            {/* 다운로드 링크: download 속성으로 즉시 저장 */}
                            <DownloadLink href={url} download={fileName}>
                              {/* SVG 아이콘 */}
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 12L3 7L4.4 5.55L7 8.15V1H9V8.15L11.6 5.55L13 7L8 12Z" fill="currentColor"/>
                                <path d="M2 14V11H4V13H12V11H14V14H2Z" fill="currentColor"/>
                              </svg>
                              다운로드
                            </DownloadLink>
                          </ImagePreview>
                        </StatusItem>
                      );
                    })
                  ) : (
                    <EmptyStatus>승인된 이미지가 없습니다.</EmptyStatus>
                  )}
                </>
              )}
            </StatusList>
          )}
        </Section>
      </ContentWrapper>

      {/* 전역 알림 컴포넌트 */}
      <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification(prev=>({...prev,show:false}))} />
    </PageContainer>
  );
};

export default Student; 