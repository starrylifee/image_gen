import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../services/api';
import socketService from '../services/socketService';
import styled from 'styled-components';
import { setupSocketListeners } from '../services/api';

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

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${props => props.active ? '#7c83fd' : '#f5f7fb'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 1rem;

  &:hover {
    background-color: ${props => props.active ? '#4e54c8' : '#e0e3f0'};
  }
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ItemCard = styled.div`
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemTitle = styled.h3`
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 0.5rem;
`;

const StudentInfo = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const Date = styled.p`
  color: #888;
  font-size: 0.8rem;
`;

const PromptContent = styled.p`
  color: #333;
  font-size: 1rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 5px;
  border-left: 3px solid #7c83fd;
`;

const ImageContainer = styled.div`
  text-align: center;
  margin-bottom: 1rem;
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 400px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const SafetyInfo = styled.div`
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  background-color: ${props => {
    switch(props.level) {
      case 'safe': return '#e8f7f0';
      case 'moderate': return '#fcf8e3';
      case 'unsafe': return '#f8d7da';
      default: return '#f9f9f9';
    }
  }};
  display: flex;
  align-items: center;
`;

const SafetyLabel = styled.span`
  font-weight: 500;
  margin-right: 0.5rem;
`;

const SafetyBadge = styled.span`
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  background-color: ${props => {
    switch(props.level) {
      case 'safe': return '#2ecc71';
      case 'moderate': return '#f39c12';
      case 'unsafe': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ApproveButton = styled(Button)`
  background-color: #2ecc71;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #27ae60;
  }
`;

const RejectButton = styled(Button)`
  background-color: #e74c3c;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #c0392b;
  }
`;

const ReasonInput = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  margin-bottom: 1rem;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #7c83fd;
  }
`;

// 일괄 처리 버튼 스타일 추가
const BatchButtonContainer = styled.div`
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
`;

const BatchButton = styled.button`
  background-color: #4caf50;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
  
  &:hover:not(:disabled) {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const EmptyMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
`;

const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

// 알림 컴포넌트 스타일
const AlertMessage = styled.div`
  padding: 10px 15px;
  margin-bottom: 15px;
  border-radius: 5px;
  font-weight: 500;
  background-color: ${props => props.type === 'error' ? '#f8d7da' : '#d4edda'};
  color: ${props => props.type === 'error' ? '#721c24' : '#155724'};
  border: 1px solid ${props => props.type === 'error' ? '#f5c6cb' : '#c3e6cb'};
  ${props => props.success && `
    background-color: #e8f5e9;
    border-left: 4px solid #4caf50;
    color: #2e7d32;
  `}
  
  ${props => props.error && `
    background-color: #ffebee;
    border-left: 4px solid #f44336;
    color: #c62828;
  `}
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

const Teacher = () => {
  const [activeTab, setActiveTab] = useState('prompts');
  const [pendingPrompts, setPendingPrompts] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProcessingIds, setBatchProcessingIds] = useState([]);
  const [rejectionReasons, setRejectionReasons] = useState({});
  // 알림 상태 추가
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  // 학생 계정 생성 관련 상태
  const [newStudents, setNewStudents] = useState([{ studentId: '', studentName: '' }]);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [classroomInfo, setClassroomInfo] = useState(null);

  // 학생 관리 관련 상태 추가
  const [studentList, setStudentList] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // 프롬프트 및 이미지 조회
  const fetchItems = async () => {
    setLoading(true);
    try {
      if (activeTab === 'prompts') {
        const data = await teacherAPI.getPendingPrompts();
        console.log('교사 화면 - 대기 중인 프롬프트 응답:', data);
        
        // data에 prompts 배열이 있으면 사용, 없으면 data 자체가 배열로 간주
        const prompts = data.prompts || data;
        console.log('처리할 프롬프트 배열:', prompts);
        
        setPendingPrompts(Array.isArray(prompts) ? prompts : []);
      } else {
        const data = await teacherAPI.getPendingImages();
        console.log('교사 화면 - 대기 중인 이미지 응답:', data);
        
        // data에 images 배열이 있으면 사용, 없으면 data 자체가 배열로 간주
        const images = data.images || data;
        console.log('처리할 이미지 배열:', images);
        
        setPendingImages(Array.isArray(images) ? images : []);
      }
    } catch (err) {
      console.error('데이터 조회 중 오류 발생:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    // 소켓 연결 및 이벤트 리스너 설정
    const socket = socketService.connect();
    
    console.log('교사 화면: 소켓 연결 설정 완료');
    
    const cleanup = setupSocketListeners(socket, {
      onNewPromptSubmitted: (data) => {
        // 새 프롬프트가 제출되면 목록 새로고침
        console.log('새 프롬프트 제출 이벤트 수신:', data);
        if (activeTab === 'prompts') {
          console.log('프롬프트 목록 새로고침');
          fetchItems();
        }
      },
      onImageGenerated: (data) => {
        // 새 이미지가 생성되면 목록 새로고침
        console.log('이미지 생성 이벤트 수신:', data);
        if (activeTab === 'images') {
          console.log('이미지 목록 새로고침');
          fetchItems();
        }
      },
      onBatchProcessingCompleted: (data) => {
        // 일괄 처리가 완료되면 목록 새로고침
        console.log('일괄 처리 완료 이벤트 수신:', data);
        setBatchProcessing(false);
        setBatchProcessingIds([]);
        if (activeTab === 'prompts') {
          console.log('프롬프트 목록 새로고침');
          fetchItems();
        }
      },
      onPromptStatusChange: (data) => {
        // 프롬프트 상태가 변경되면 목록에서 제거
        console.log('프롬프트 상태 변경 이벤트 수신:', data);
        if ((data.status === 'approved' || data.status === 'rejected') && activeTab === 'prompts') {
          setPendingPrompts(prev => prev.filter(p => p._id !== data.promptId));
          // 일괄 처리 목록에서도 제거
          setBatchProcessingIds(prev => prev.filter(id => id !== data.promptId));
        }
      }
    });
    
    // 초기 데이터 로드
    fetchItems();
    
    return () => {
      cleanup && cleanup();
      socketService.disconnect();
    };
  }, [activeTab]); // fetchItems는 이 훅 내부에서 정의되므로 의존성 목록에 포함하지 않음

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 거부 사유 입력 핸들러
  const handleReasonChange = (id, reason) => {
    setRejectionReasons({
      ...rejectionReasons,
      [id]: reason
    });
  };

  // 프롬프트 처리 핸들러
  const handleProcessPrompt = async (promptId, status) => {
    // 이미 일괄 처리 중인 프롬프트인지 확인
    if (batchProcessingIds.includes(promptId)) {
      setNotification({
        show: true,
        message: '이미 일괄 처리 중인 프롬프트입니다.',
        type: 'warning'
      });
      return;
    }

    setProcessing(true);
    try {
      await teacherAPI.processPrompt(
        promptId, 
        status, 
        status === 'rejected' ? rejectionReasons[promptId] || '내용이 부적절합니다.' : ''
      );
      
      // 목록에서 해당 프롬프트 제거
      setPendingPrompts(pendingPrompts.filter(p => p._id !== promptId));
      
      // 거부 사유 초기화
      const newReasons = { ...rejectionReasons };
      delete newReasons[promptId];
      setRejectionReasons(newReasons);
      
      // 성공 알림 표시
      setNotification({
        show: true,
        message: status === 'approved' ? '프롬프트가 성공적으로 승인되었습니다.' : '프롬프트가 거부되었습니다.',
        type: 'success'
      });
      
      // 5초 후 알림 숨기기
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
    } catch (err) {
      console.error('프롬프트 처리 중 오류 발생:', err);
      
      // 오류 메시지 처리 - 크레딧 부족 오류 특별 처리
      let errorMessage = '프롬프트 처리 중 오류가 발생했습니다.';
      
      if (err.message && err.message.includes('크레딧이 부족')) {
        errorMessage = '크레딧이 부족하여 이미지를 생성할 수 없습니다. 관리자에게 크레딧 충전을 요청하세요.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // 오류 알림 표시
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error'
      });
      
      // 10초 후 알림 숨기기
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 10000);
    } finally {
      setProcessing(false);
    }
  };

  // 이미지 처리 핸들러
  const handleProcessImage = async (imageId, status) => {
    setProcessing(true);
    try {
      await teacherAPI.processImage(
        imageId, 
        status, 
        status === 'rejected' ? rejectionReasons[imageId] || '이미지가 부적절합니다.' : ''
      );
      
      // 목록에서 해당 이미지 제거
      setPendingImages(pendingImages.filter(i => i._id !== imageId));
      
      // 거부 사유 초기화
      const newReasons = { ...rejectionReasons };
      delete newReasons[imageId];
      setRejectionReasons(newReasons);
      
      // 성공 알림 표시
      setNotification({
        show: true,
        message: status === 'approved' ? '이미지가 성공적으로 승인되었습니다.' : '이미지가 거부되었습니다.',
        type: 'success'
      });
      
      // 5초 후 알림 숨기기
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
    } catch (err) {
      console.error('이미지 처리 중 오류 발생:', err);
      
      // 오류 메시지 처리
      let errorMessage = '이미지 처리 중 오류가 발생했습니다.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // 오류 알림 표시
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error'
      });
      
      // 10초 후 알림 숨기기
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 10000);
    } finally {
      setProcessing(false);
    }
  };

  // 안전성 레벨 텍스트 변환
  const getSafetyLevelText = (level) => {
    switch(level) {
      case 'safe': return '안전';
      case 'moderate': return '보통';
      case 'unsafe': return '위험';
      default: return level;
    }
  };

  // 교사 정보 및 클래스룸 정보 로드
  useEffect(() => {
    const loadTeacherInfo = async () => {
      try {
        // 로컬 스토리지에서 사용자 정보 가져오기
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          // 교실 정보 추출
          const classroom = user.metadata?.classroom || '미지정 반';
          setClassroomInfo({
            teacherName: user.name,
            classroom: classroom,
            teacherId: user._id
          });
        }
      } catch (error) {
        console.error('교사 정보 로드 중 오류:', error);
      }
    };
    
    loadTeacherInfo();
  }, []);

  // 학생 계정 생성 폼 필드 업데이트
  const handleStudentInputChange = (index, field, value) => {
    const updatedStudents = [...newStudents];
    updatedStudents[index][field] = value;
    setNewStudents(updatedStudents);
  };

  // 학생 폼 행 추가
  const addStudentRow = () => {
    setNewStudents([...newStudents, { studentId: '', studentName: '' }]);
  };

  // 학생 폼 행 제거
  const removeStudentRow = (index) => {
    if (newStudents.length > 1) {
      const updatedStudents = [...newStudents];
      updatedStudents.splice(index, 1);
      setNewStudents(updatedStudents);
    }
  };

  // 학생 계정 생성 요청
  const createStudentAccounts = async () => {
    // 입력 검증
    const invalidEntries = newStudents.filter(
      student => !student.studentId || !student.studentName
    );
    
    if (invalidEntries.length > 0) {
      setCreateError('모든 학생 ID와 이름을 입력해주세요.');
      return;
    }
    
    try {
      setCreating(true);
      setCreateError(null);
      setCreateSuccess(null);
      
      // API 호출 구현
      const response = await fetch('http://localhost:5000/api/teacher/create-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          students: newStudents.map(student => ({
            username: student.studentId,
            name: student.studentName,
            password: 'student123', // 기본 비밀번호
            classroom: classroomInfo?.classroom || '미지정 반'
          }))
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '학생 계정 생성 중 오류가 발생했습니다.');
      }
      
      setCreateSuccess(`${data.createdCount}개의 학생 계정이 생성되었습니다.`);
      setNewStudents([{ studentId: '', studentName: '' }]); // 폼 초기화
    } catch (error) {
      console.error('학생 계정 생성 오류:', error);
      setCreateError(error.message || '학생 계정 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 학생 목록 로드
  const loadStudents = async () => {
    if (activeTab !== 'students') return;
    
    try {
      setStudentLoading(true);
      const response = await fetch('http://localhost:5000/api/teacher/my-students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('학생 목록을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      console.log('학생 목록 로드 성공:', data.students.length, '명');
      setStudentList(data.students);
    } catch (error) {
      console.error('학생 목록 로드 오류:', error);
      setCreateError(error.message || '학생 목록을 불러오는데 실패했습니다');
    } finally {
      setStudentLoading(false);
    }
  };

  // 탭 변경 시 학생 목록 로드
  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    }
  }, [activeTab]);

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async () => {
    if (!selectedStudent || !newPassword || newPassword.length < 6) {
      setCreateError('학생과 6자 이상의 비밀번호를 입력해주세요');
      return;
    }
    
    try {
      setCreating(true);
      
      const response = await fetch('http://localhost:5000/api/teacher/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studentId: selectedStudent._id,
          newPassword
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '비밀번호 변경에 실패했습니다');
      }
      
      setCreateSuccess(`${selectedStudent.name}의 비밀번호가 변경되었습니다`);
      setNewPassword('');
      setShowPasswordModal(false);
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setCreateError(error.message || '비밀번호 변경에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  // 학생 삭제 핸들러
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('정말 이 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/delete-student/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '학생 삭제에 실패했습니다');
      }
      
      setCreateSuccess('학생이 삭제되었습니다');
      loadStudents(); // 목록 새로고침
    } catch (error) {
      console.error('학생 삭제 오류:', error);
      setCreateError(error.message || '학생 삭제에 실패했습니다');
    }
  };

  // 일괄 처리 핸들러 함수 추가
  const handleBatchProcessPrompts = async () => {
    if (pendingPrompts.length === 0) {
      setNotification({
        show: true,
        message: '처리할 프롬프트가 없습니다.',
        type: 'warning'
      });
      return;
    }

    // 확인 메시지
    if (!window.confirm(`${pendingPrompts.length}개의 프롬프트를 일괄 승인하시겠습니까? 필요한 크레딧: ${pendingPrompts.length}`)) {
      return;
    }

    setBatchProcessing(true);
    try {
      // 모든 프롬프트 ID 목록 추출
      const promptIds = pendingPrompts.map(prompt => prompt._id);
      
      // 일괄 처리 중인 프롬프트 ID 목록 설정
      setBatchProcessingIds(promptIds);
      
      // 일괄 처리 API 호출
      const result = await teacherAPI.batchProcessPrompts(promptIds);
      
      // 성공 알림 표시
      setNotification({
        show: true,
        message: `${pendingPrompts.length}개의 프롬프트가 일괄 처리되었습니다. 이미지가 생성되는 동안 기다려주세요.`,
        type: 'success'
      });
      
    } catch (err) {
      console.error('일괄 처리 중 오류 발생:', err);
      
      // 오류 메시지 처리
      let errorMessage = '일괄 처리 중 오류가 발생했습니다.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // 오류 알림 표시
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error'
      });
      
      // 일괄 처리 상태 초기화
      setBatchProcessing(false);
      setBatchProcessingIds([]);
    }
  };

  const renderContent = () => {
    if (activeTab === 'prompts') {
      return (
        pendingPrompts.length === 0 ? (
          <EmptyMessage>검토할 프롬프트가 없습니다.</EmptyMessage>
        ) : (
          <>
            <BatchButtonContainer>
              <BatchButton 
                onClick={handleBatchProcessPrompts}
                disabled={batchProcessing}
              >
                모든 프롬프트 일괄 승인 ({pendingPrompts.length}개)
                {batchProcessing && ' (처리 중...)'}
              </BatchButton>
            </BatchButtonContainer>
            <ItemsList>
              {pendingPrompts.map((prompt) => {
                const isProcessingBatch = batchProcessingIds.includes(prompt._id);
                
                return (
                  <ItemCard 
                    key={prompt._id}
                    style={isProcessingBatch ? { opacity: 0.7 } : {}}
                  >
                    <ItemHeader>
                      <ItemInfo>
                        <ItemTitle>프롬프트 요청</ItemTitle>
                        <StudentInfo>
                          학생: {prompt.student ? prompt.student.name : '알 수 없음'} ({prompt.student ? prompt.student.username : ''})
                        </StudentInfo>
                        <Date>
                          제출일: {formatDate(prompt.createdAt)}
                        </Date>
                      </ItemInfo>
                    </ItemHeader>
                    
                    {isProcessingBatch && <ProcessingBadge>처리 중...</ProcessingBadge>}
                    
                    <PromptContent>{prompt.content}</PromptContent>
                    
                    {prompt.status === 'rejected' && (
                      <ReasonInput
                        placeholder="거부 사유를 입력하세요..."
                        value={rejectionReasons[prompt._id] || ''}
                        onChange={(e) => handleReasonChange(prompt._id, e.target.value)}
                      />
                    )}
                    
                    <ActionButtons>
                      <ApproveButton 
                        onClick={() => handleProcessPrompt(prompt._id, 'approved')}
                        disabled={processing || isProcessingBatch}
                      >
                        승인
                      </ApproveButton>
                      <RejectButton 
                        onClick={() => handleProcessPrompt(prompt._id, 'rejected')}
                        disabled={processing || isProcessingBatch}
                      >
                        거부
                      </RejectButton>
                    </ActionButtons>
                  </ItemCard>
                );
              })}
            </ItemsList>
          </>
        )
      );
    } else if (activeTab === 'images') {
      return (
        pendingImages.length === 0 ? (
          <EmptyMessage>검토할 이미지가 없습니다.</EmptyMessage>
        ) : (
          <ItemsList>
            {pendingImages.map((image) => (
              <ItemCard key={image._id}>
                <ItemHeader>
                  <ItemInfo>
                    <ItemTitle>생성된 이미지</ItemTitle>
                    <StudentInfo>
                      학생: {image.student ? image.student.name : '알 수 없음'} ({image.student ? image.student.username : ''})
                    </StudentInfo>
                    <Date>
                      생성일: {formatDate(image.createdAt)}
                    </Date>
                  </ItemInfo>
                </ItemHeader>
                
                <PromptContent>
                  {image.prompt ? image.prompt.content : '프롬프트 정보 없음'}
                </PromptContent>
                
                <ImageContainer>
                  {image.path ? (
                    <Image 
                      src={image.isExternalUrl 
                        ? image.path // 외부 URL은 그대로 사용
                        : image.path.startsWith('http') 
                          ? image.path 
                          : `http://localhost:5000${image.path}`} 
                      alt="생성된 이미지" 
                      onError={(e) => {
                        console.error('이미지 로드 실패:', e);
                        e.target.src = 'https://via.placeholder.com/400x300?text=이미지+로드+실패';
                      }}
                      onLoad={() => console.log('이미지 로드 성공:', image.path)}
                    />
                  ) : (
                    <p>이미지를 불러올 수 없습니다</p>
                  )}
                </ImageContainer>
                
                <SafetyInfo level={image.safetyLevel}>
                  <SafetyLabel>안전성 평가:</SafetyLabel>
                  <SafetyBadge level={image.safetyLevel}>
                    {getSafetyLevelText(image.safetyLevel)}
                  </SafetyBadge>
                </SafetyInfo>
                
                {image.status === 'rejected' && (
                  <ReasonInput
                    placeholder="거부 사유를 입력하세요..."
                    value={rejectionReasons[image._id] || ''}
                    onChange={(e) => handleReasonChange(image._id, e.target.value)}
                  />
                )}
                
                <ActionButtons>
                  <ApproveButton 
                    onClick={() => handleProcessImage(image._id, 'approved')}
                    disabled={processing}
                  >
                    승인
                  </ApproveButton>
                  <RejectButton 
                    onClick={() => handleProcessImage(image._id, 'rejected')}
                    disabled={processing}
                  >
                    거부
                  </RejectButton>
                </ActionButtons>
              </ItemCard>
            ))}
          </ItemsList>
        )
      );
    } else if (activeTab === 'students') {
      return (
        <div>
          <SectionTitle>학생 관리</SectionTitle>
          {classroomInfo && (
            <ClassroomInfo>
              {classroomInfo.teacherName} 선생님의 {classroomInfo.classroom}
            </ClassroomInfo>
          )}
          
          {createSuccess && (
            <AlertMessage success>
              {createSuccess}
            </AlertMessage>
          )}
          
          {createError && (
            <AlertMessage error>
              {createError}
            </AlertMessage>
          )}

          {/* 기존 학생 목록 */}
          <StudentListContainer>
            <FormTitle>내 학생 목록</FormTitle>
            {studentLoading ? (
              <LoadingMessage>학생 목록을 불러오는 중...</LoadingMessage>
            ) : studentList.length === 0 ? (
              <EmptyMessage>등록된 학생이 없습니다.</EmptyMessage>
            ) : (
              <StudentTable>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>아이디</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {studentList.map(student => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.username}</td>
                      <td>
                        <ActionButtonsContainer>
                          <ActionButton 
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowPasswordModal(true);
                            }}
                            title="비밀번호 변경"
                          >
                            🔑
                          </ActionButton>
                          <ActionButton 
                            className="remove"
                            onClick={() => handleDeleteStudent(student._id)}
                            title="학생 삭제"
                          >
                            🗑️
                          </ActionButton>
                        </ActionButtonsContainer>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StudentTable>
            )}
          </StudentListContainer>
          
          {/* 비밀번호 변경 모달 */}
          {showPasswordModal && (
            <ModalOverlay>
              <ModalContent>
                <ModalHeader>비밀번호 변경 - {selectedStudent?.name}</ModalHeader>
                <ModalBody>
                  <FormLabel>새 비밀번호</FormLabel>
                  <PasswordInputContainer>
                    <PasswordInput
                      type={passwordVisible ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (6자 이상)"
                    />
                    <TogglePasswordButton
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      title={passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      {passwordVisible ? "👁️" : "👁️‍🗨️"}
                    </TogglePasswordButton>
                  </PasswordInputContainer>
                </ModalBody>
                <ModalFooter>
                  <SubmitButton 
                    onClick={handlePasswordChange}
                    disabled={creating}
                  >
                    {creating ? "변경 중..." : "비밀번호 변경"}
                  </SubmitButton>
                  <CancelButton 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                    }}
                  >
                    취소
                  </CancelButton>
                </ModalFooter>
              </ModalContent>
            </ModalOverlay>
          )}

          {/* 새 학생 추가 폼 */}
          <FormContainer>
            <FormTitle>새 학생 계정</FormTitle>
            <FormDescription>
              학생 ID와 이름을 입력하세요. 기본 비밀번호는 'student123'으로 설정됩니다.
            </FormDescription>
            
            {newStudents.map((student, index) => (
              <StudentRow key={index}>
                <StudentInput
                  type="text"
                  placeholder="학생 ID (예: 1반홍길동)"
                  value={student.studentId}
                  onChange={(e) => handleStudentInputChange(index, 'studentId', e.target.value)}
                />
                <StudentInput
                  type="text"
                  placeholder="학생 이름 (예: 홍길동)"
                  value={student.studentName}
                  onChange={(e) => handleStudentInputChange(index, 'studentName', e.target.value)}
                />
                <ButtonWrapper>
                  {index === newStudents.length - 1 ? (
                    <ActionButton className="add" onClick={addStudentRow}>
                      +
                    </ActionButton>
                  ) : (
                    <ActionButton className="remove" onClick={() => removeStudentRow(index)}>
                      -
                    </ActionButton>
                  )}
                </ButtonWrapper>
              </StudentRow>
            ))}
            
            <SubmitButton 
              onClick={createStudentAccounts} 
              disabled={creating}
            >
              {creating ? '생성 중...' : '학생 계정 생성'}
            </SubmitButton>
          </FormContainer>
        </div>
      );
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>교사 대시보드</Title>
        <SubTitle>학생들의 프롬프트와 생성된 이미지를 검토하세요.</SubTitle>
      </Header>
      
      {/* 알림 메시지 표시 */}
      {notification.show && (
        <AlertMessage type={notification.type}>
          {notification.message}
        </AlertMessage>
      )}
      
      <TabsContainer>
        <Tab 
          active={activeTab === 'prompts'} 
          onClick={() => handleTabChange('prompts')}
        >
          프롬프트 검토 ({pendingPrompts.length})
        </Tab>
        <Tab 
          active={activeTab === 'images'} 
          onClick={() => handleTabChange('images')}
        >
          이미지 검토 ({pendingImages.length})
        </Tab>
        <Tab 
          active={activeTab === 'students'} 
          onClick={() => handleTabChange('students')}
        >
          학생 관리
        </Tab>
      </TabsContainer>
      
      {loading ? (
        <LoadingMessage>로딩 중...</LoadingMessage>
      ) : renderContent()}
    </PageContainer>
  );
};

// 학생 관리 관련 스타일 컴포넌트
const ClassroomInfo = styled.div`
  background-color: #f0f7ff;
  padding: 12px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
  color: #0056b3;
  border-left: 4px solid #0056b3;
`;

const FormContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FormTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  color: #333;
`;

const FormDescription = styled.p`
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
`;

const StudentRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  gap: 10px;
`;

const StudentInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    border-color: #0056b3;
    outline: none;
  }
`;

const ButtonWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ActionButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  
  &.add {
    background-color: #4caf50;
    color: white;
  }
  
  &.remove {
    background-color: #f44336;
    color: white;
  }
`;

const SubmitButton = styled.button`
  background-color: #0056b3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #003d82;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

// 스타일 컴포넌트 부분에 SectionTitle 추가
const SectionTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 16px;
  color: #333;
  border-bottom: 2px solid #0056b3;
  padding-bottom: 8px;
`;

// 학생 목록 관련 스타일 컴포넌트 추가
const StudentListContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const StudentTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background-color: #f9f9f9;
    font-weight: 500;
  }
  
  tr:hover {
    background-color: #f5f5f5;
  }
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
`;

// 모달 관련 스타일 컴포넌트
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.h3`
  margin-top: 0;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
`;

const ModalBody = styled.div`
  margin-bottom: 20px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const PasswordInputContainer = styled.div`
  display: flex;
  position: relative;
`;

const PasswordInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    border-color: #0056b3;
    outline: none;
  }
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
`;

const CancelButton = styled.button`
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #e5e5e5;
  }
`;

// ProcessingBadge 스타일 컴포넌트 추가 (렌더링 부분 전에 추가)
const ProcessingBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f39c12;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
`;

export default Teacher; 