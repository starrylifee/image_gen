import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('teachers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 교사 관리 관련 상태
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [viewHistoryTeacherId, setViewHistoryTeacherId] = useState(null);
  
  // 계정 생성 관련 상태
  const [newTeacher, setNewTeacher] = useState({
    username: '',
    password: '',
    name: '',
    classroom: '',
    credits: 0
  });
  
  // 학생 계정 생성 관련 상태
  const [newStudents, setNewStudents] = useState('');
  const [defaultStudentPassword, setDefaultStudentPassword] = useState('student123');
  
  // 비밀번호 변경 관련 상태
  const [newPassword, setNewPassword] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [showStudents, setShowStudents] = useState(false);
  
  // 시스템 통계 관련 상태
  const [statistics, setStatistics] = useState(null);
  
  // 교사 목록 조회
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/teachers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('교사 목록을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      console.error('교사 목록 조회 오류:', err);
      setError(err.message || '교사 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 교사 크레딧 내역 조회
  const fetchCreditHistory = async (teacherId) => {
    try {
      setLoading(true);
      setError(null);
      setViewHistoryTeacherId(teacherId);
      
      const response = await fetch(`/api/admin/teachers/${teacherId}/credits`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('크레딧 내역을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setCreditHistory(data.creditHistory || []);
      setSelectedTeacher(data.teacher);
    } catch (err) {
      console.error('크레딧 내역 조회 오류:', err);
      setError(err.message || '크레딧 내역을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 크레딧 충전
  const handleCreditCharge = async (e) => {
    e.preventDefault();
    
    if (!selectedTeacher) {
      setError('선택된 교사가 없습니다');
      return;
    }
    
    if (!creditAmount || isNaN(parseInt(creditAmount)) || parseInt(creditAmount) <= 0) {
      setError('유효한 충전량을 입력해주세요');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/admin/teachers/${selectedTeacher._id}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseInt(creditAmount),
          reason: creditReason || '관리자에 의한 충전'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '크레딧 충전에 실패했습니다');
      }
      
      // 성공 메시지 표시
      setSuccess(`${selectedTeacher.name} 교사에게 ${creditAmount}크레딧이 충전되었습니다`);
      
      // 크레딧 내역 새로고침
      fetchCreditHistory(selectedTeacher._id);
      
      // 교사 목록 새로고침
      fetchTeachers();
      
      // 입력 필드 초기화
      setCreditAmount('');
      setCreditReason('');
    } catch (err) {
      console.error('크레딧 충전 오류:', err);
      setError(err.message || '크레딧 충전에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 교사 계정 생성
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    
    // 기본 검증
    if (!newTeacher.username || !newTeacher.password || !newTeacher.name) {
      setError('아이디, 비밀번호, 이름은 필수 입력 항목입니다');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newTeacher)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '교사 계정 생성에 실패했습니다');
      }
      
      // 성공 메시지 표시
      setSuccess(`교사 계정 "${newTeacher.name}(${newTeacher.username})"이 생성되었습니다`);
      
      // 교사 목록 새로고침
      fetchTeachers();
      
      // 입력 필드 초기화
      setNewTeacher({
        username: '',
        password: '',
        name: '',
        classroom: '',
        credits: 0
      });
    } catch (err) {
      console.error('교사 계정 생성 오류:', err);
      setError(err.message || '교사 계정 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 학생 목록 조회
  const fetchTeacherStudents = async (teacherId) => {
    if (!teacherId) {
      setError('선택된 교사가 없습니다');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setShowStudents(true);
      
      const response = await fetch(`/api/admin/teachers/${teacherId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('학생 목록을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setStudentsList(data.students || []);
    } catch (err) {
      console.error('학생 목록 조회 오류:', err);
      setError(err.message || '학생 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 학생 계정 생성
  const handleCreateStudents = async (e) => {
    e.preventDefault();
    
    if (!selectedTeacher) {
      setError('학생을 생성할 교사를 선택해주세요');
      return;
    }
    
    if (!newStudents.trim()) {
      setError('학생 정보를 입력해주세요');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // 학생 정보 파싱
      const studentLines = newStudents.split('\n').filter(line => line.trim());
      const students = studentLines.map(line => {
        const [username, name] = line.split(',').map(item => item.trim());
        return { username, name };
      });
      
      const response = await fetch(`/api/admin/teachers/${selectedTeacher._id}/create-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          students,
          defaultPassword: defaultStudentPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '학생 계정 생성에 실패했습니다');
      }
      
      // 성공 메시지 표시
      setSuccess(
        `${data.createdCount}명의 학생 계정이 생성되었습니다` + 
        (data.failedCount > 0 ? `. ${data.failedCount}명은 생성 실패.` : '')
      );
      
      // 학생 목록 새로고침
      fetchTeacherStudents(selectedTeacher._id);
      
      // 입력 필드 초기화
      setNewStudents('');
    } catch (err) {
      console.error('학생 계정 생성 오류:', err);
      setError(err.message || '학생 계정 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 비밀번호 변경
  const handleChangePassword = async (userId) => {
    if (!newPassword) {
      setError('새 비밀번호를 입력해주세요');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '비밀번호 변경에 실패했습니다');
      }
      
      // 성공 메시지 표시
      setSuccess(`${data.user.name}(${data.user.username})의 비밀번호가 성공적으로 변경되었습니다`);
      
      // 입력 필드 초기화
      setNewPassword('');
    } catch (err) {
      console.error('비밀번호 변경 오류:', err);
      setError(err.message || '비밀번호 변경에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 시스템 통계 조회
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('통계 정보를 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setStatistics(data.statistics);
    } catch (err) {
      console.error('통계 조회 오류:', err);
      setError(err.message || '통계 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    if (activeTab === 'teachers') {
      fetchTeachers();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    } else if (activeTab === 'accounts') {
      fetchTeachers();
    }
  }, [activeTab]);
  
  // 날짜 포맷 유틸리티 함수
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ko-KR', options);
  };
  
  // 교사 크레딧 관리 화면 렌더링
  const renderTeacherCreditManagement = () => {
    return (
      <div>
        <SectionTitle>교사 크레딧 관리</SectionTitle>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        
        {/* 교사 목록 */}
        <TableContainer>
          <h3>교사 목록</h3>
          {loading && !teachers.length ? (
            <LoadingMessage>교사 목록을 불러오는 중...</LoadingMessage>
          ) : teachers.length === 0 ? (
            <EmptyMessage>등록된 교사가 없습니다.</EmptyMessage>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>아이디</th>
                  <th>반</th>
                  <th>크레딧</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher._id} className={selectedTeacher?._id === teacher._id ? 'selected' : ''}>
                    <td>{teacher.name}</td>
                    <td>{teacher.username}</td>
                    <td>{teacher.metadata?.classroom || '미지정'}</td>
                    <td className={teacher.credits < 5 ? 'low-credits' : ''}>
                      {teacher.credits}
                      {teacher.credits < 5 && <span className="warning"> (부족)</span>}
                    </td>
                    <td>
                      <ButtonGroup>
                        <ActionButton 
                          onClick={() => setSelectedTeacher(teacher)}
                          className="select"
                        >
                          선택
                        </ActionButton>
                        <ActionButton 
                          onClick={() => fetchCreditHistory(teacher._id)}
                          className="view"
                        >
                          내역
                        </ActionButton>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableContainer>
        
        {/* 크레딧 충전 폼 */}
        {selectedTeacher && (
          <FormContainer>
            <h3>{selectedTeacher.name} 교사 크레딧 충전</h3>
            <form onSubmit={handleCreditCharge}>
              <FormGroup>
                <Label>현재 보유 크레딧</Label>
                <CreditDisplay className={selectedTeacher.credits < 5 ? 'low' : ''}>
                  {selectedTeacher.credits}
                </CreditDisplay>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="creditAmount">충전할 크레딧</Label>
                <Input
                  id="creditAmount"
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="충전할 크레딧 수"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="creditReason">충전 사유</Label>
                <TextArea
                  id="creditReason"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="충전 사유 (선택사항)"
                  rows="2"
                />
              </FormGroup>
              
              <SubmitButton type="submit" disabled={loading}>
                {loading ? '처리 중...' : '크레딧 충전'}
              </SubmitButton>
            </form>
          </FormContainer>
        )}
        
        {/* 크레딧 사용 내역 */}
        {viewHistoryTeacherId && (
          <TableContainer>
            <h3>
              {selectedTeacher?.name || '선택된 교사'} 크레딧 사용 내역
              <RefreshButton onClick={() => fetchCreditHistory(viewHistoryTeacherId)}>
                새로고침
              </RefreshButton>
            </h3>
            
            {loading && !creditHistory.length ? (
              <LoadingMessage>크레딧 내역을 불러오는 중...</LoadingMessage>
            ) : creditHistory.length === 0 ? (
              <EmptyMessage>크레딧 사용 내역이 없습니다.</EmptyMessage>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>변동 크레딧</th>
                    <th>사유</th>
                    <th>처리자</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map((record, index) => (
                    <tr key={index}>
                      <td>{formatDate(record.timestamp)}</td>
                      <td className={record.amount > 0 ? 'positive' : 'negative'}>
                        {record.amount > 0 ? `+${record.amount}` : record.amount}
                      </td>
                      <td>{record.reason}</td>
                      <td>{record.adminName || '시스템'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </TableContainer>
        )}
      </div>
    );
  };
  
  // 계정 관리 화면 렌더링
  const renderAccountManagement = () => {
    return (
      <div>
        <SectionTitle>계정 관리</SectionTitle>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        
        <Subsection>
          <h3>교사 계정 생성</h3>
          <FormContainer>
            <form onSubmit={handleCreateTeacher}>
              <FormGroup>
                <Label htmlFor="teacherUsername">아이디</Label>
                <Input
                  id="teacherUsername"
                  value={newTeacher.username}
                  onChange={(e) => setNewTeacher({...newTeacher, username: e.target.value})}
                  placeholder="교사 아이디 (예: teacher1)"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="teacherPassword">비밀번호</Label>
                <Input
                  id="teacherPassword"
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}
                  placeholder="비밀번호"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="teacherName">이름</Label>
                <Input
                  id="teacherName"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                  placeholder="교사 이름"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="teacherClassroom">학급명</Label>
                <Input
                  id="teacherClassroom"
                  value={newTeacher.classroom}
                  onChange={(e) => setNewTeacher({...newTeacher, classroom: e.target.value})}
                  placeholder="학급명 (예: 3학년 2반)"
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="teacherCredits">초기 크레딧</Label>
                <Input
                  id="teacherCredits"
                  type="number"
                  min="0"
                  value={newTeacher.credits}
                  onChange={(e) => setNewTeacher({...newTeacher, credits: parseInt(e.target.value) || 0})}
                  placeholder="초기 크레딧 수"
                />
              </FormGroup>
              
              <SubmitButton type="submit" disabled={loading}>
                {loading ? '생성 중...' : '교사 계정 생성'}
              </SubmitButton>
            </form>
          </FormContainer>
        </Subsection>
        
        <Subsection>
          <h3>교사 목록</h3>
          <TableContainer>
            {loading && !teachers.length ? (
              <LoadingMessage>교사 목록을 불러오는 중...</LoadingMessage>
            ) : teachers.length === 0 ? (
              <EmptyMessage>등록된 교사가 없습니다.</EmptyMessage>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>아이디</th>
                    <th>반</th>
                    <th>크레딧</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(teacher => (
                    <tr key={teacher._id} className={selectedTeacher?._id === teacher._id ? 'selected' : ''}>
                      <td>{teacher.name}</td>
                      <td>{teacher.username}</td>
                      <td>{teacher.metadata?.classroom || '미지정'}</td>
                      <td>{teacher.credits}</td>
                      <td>
                        <ButtonGroup>
                          <ActionButton 
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowStudents(false);
                            }}
                            className="select"
                          >
                            선택
                          </ActionButton>
                          <ActionButton 
                            onClick={() => fetchTeacherStudents(teacher._id)}
                            className="view"
                          >
                            학생 목록
                          </ActionButton>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </TableContainer>
        </Subsection>
        
        {/* 비밀번호 변경 */}
        {selectedTeacher && (
          <Subsection>
            <h3>{selectedTeacher.name} 교사 비밀번호 변경</h3>
            <FormContainer>
              <FormGroup>
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <InputGroup>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호"
                  />
                  <ActionButton 
                    onClick={() => handleChangePassword(selectedTeacher._id)}
                    className="select"
                    disabled={loading || !newPassword}
                  >
                    {loading ? '변경 중...' : '변경'}
                  </ActionButton>
                </InputGroup>
              </FormGroup>
            </FormContainer>
          </Subsection>
        )}
        
        {/* 학생 계정 생성 */}
        {selectedTeacher && (
          <Subsection>
            <h3>{selectedTeacher.name} 교사의 학생 계정 생성</h3>
            <FormContainer>
              <form onSubmit={handleCreateStudents}>
                <FormGroup>
                  <Label htmlFor="defaultStudentPassword">기본 비밀번호</Label>
                  <Input
                    id="defaultStudentPassword"
                    value={defaultStudentPassword}
                    onChange={(e) => setDefaultStudentPassword(e.target.value)}
                    placeholder="모든 학생의 기본 비밀번호"
                  />
                  <HelpText>개별 비밀번호를 설정하지 않은 학생에게 적용됩니다</HelpText>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="newStudents">학생 정보 (한 줄에 하나씩)</Label>
                  <TextArea
                    id="newStudents"
                    value={newStudents}
                    onChange={(e) => setNewStudents(e.target.value)}
                    placeholder="아이디,이름 (예: student1,홍길동)"
                    rows="5"
                  />
                  <HelpText>각 줄에 "아이디,이름" 형식으로 입력하세요</HelpText>
                </FormGroup>
                
                <SubmitButton type="submit" disabled={loading}>
                  {loading ? '생성 중...' : '학생 계정 생성'}
                </SubmitButton>
              </form>
            </FormContainer>
          </Subsection>
        )}
        
        {/* 학생 목록 */}
        {showStudents && (
          <Subsection>
            <h3>{selectedTeacher ? `${selectedTeacher.name} 교사의 학생 목록` : '학생 목록'}</h3>
            <TableContainer>
              {loading ? (
                <LoadingMessage>학생 목록을 불러오는 중...</LoadingMessage>
              ) : studentsList.length === 0 ? (
                <EmptyMessage>등록된 학생이 없습니다.</EmptyMessage>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>아이디</th>
                      <th>교실</th>
                      <th>생성일</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map(student => (
                      <tr key={student._id}>
                        <td>{student.name}</td>
                        <td>{student.username}</td>
                        <td>{student.metadata?.classroom || '미지정'}</td>
                        <td>{formatDate(student.createdAt)}</td>
                        <td>
                          <ButtonGroup>
                            <ActionButton 
                              onClick={() => {
                                setNewPassword('');
                                handleChangePassword(student._id);
                              }}
                              className="view"
                            >
                              비밀번호 초기화
                            </ActionButton>
                          </ButtonGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </TableContainer>
          </Subsection>
        )}
      </div>
    );
  };
  
  // 시스템 통계 화면 렌더링
  const renderStatistics = () => {
    if (loading && !statistics) {
      return <LoadingMessage>통계 정보를 불러오는 중...</LoadingMessage>;
    }
    
    if (!statistics) {
      return <EmptyMessage>통계 정보를 불러올 수 없습니다.</EmptyMessage>;
    }
    
    return (
      <div>
        <SectionTitle>시스템 통계</SectionTitle>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <StatsContainer>
          <StatsCard>
            <h3>사용자 통계</h3>
            <StatsList>
              <StatsItem>
                <StatLabel>전체 교사 수</StatLabel>
                <StatValue>{statistics.users.totalTeachers}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>전체 학생 수</StatLabel>
                <StatValue>{statistics.users.totalStudents}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>활성 교사 (최근 30일)</StatLabel>
                <StatValue>{statistics.users.activeTeachersLastMonth}</StatValue>
              </StatsItem>
            </StatsList>
          </StatsCard>
          
          <StatsCard>
            <h3>콘텐츠 통계</h3>
            <StatsList>
              <StatsItem>
                <StatLabel>전체 프롬프트 수</StatLabel>
                <StatValue>{statistics.content.totalPrompts}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>승인된 프롬프트</StatLabel>
                <StatValue>{statistics.content.approvedPrompts}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>거부된 프롬프트</StatLabel>
                <StatValue>{statistics.content.rejectedPrompts}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>대기 중인 프롬프트</StatLabel>
                <StatValue>{statistics.content.pendingPrompts}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>전체 이미지 수</StatLabel>
                <StatValue>{statistics.content.totalImages}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>승인된 이미지</StatLabel>
                <StatValue>{statistics.content.approvedImages}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>거부된 이미지</StatLabel>
                <StatValue>{statistics.content.rejectedImages}</StatValue>
              </StatsItem>
            </StatsList>
          </StatsCard>
          
          <StatsCard>
            <h3>크레딧 통계</h3>
            <StatsList>
              <StatsItem>
                <StatLabel>총 발행 크레딧</StatLabel>
                <StatValue>{statistics.credits.totalCreditsIssued}</StatValue>
              </StatsItem>
              <StatsItem>
                <StatLabel>총 크레딧 거래 건수</StatLabel>
                <StatValue>{statistics.credits.totalCreditTransactions}</StatValue>
              </StatsItem>
            </StatsList>
          </StatsCard>
        </StatsContainer>
      </div>
    );
  };
  
  return (
    <PageContainer>
      <Header>
        <Title>관리자 대시보드</Title>
        <SubTitle>학생과 교사 계정을 관리하고 시스템 통계를 확인하세요.</SubTitle>
        
        <TabsContainer>
          <Tab
            active={activeTab === 'teachers'}
            onClick={() => setActiveTab('teachers')}
          >
            교사 크레딧 관리
          </Tab>
          <Tab
            active={activeTab === 'accounts'}
            onClick={() => setActiveTab('accounts')}
          >
            계정 관리
          </Tab>
          <Tab
            active={activeTab === 'statistics'}
            onClick={() => setActiveTab('statistics')}
          >
            시스템 통계
          </Tab>
        </TabsContainer>
      </Header>
      
      <ContentSection>
        {activeTab === 'teachers' && renderTeacherCreditManagement()}
        {activeTab === 'accounts' && renderAccountManagement()}
        {activeTab === 'statistics' && renderStatistics()}
      </ContentSection>
    </PageContainer>
  );
};

// 스타일 컴포넌트
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
  margin-bottom: 1rem;
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

const ContentSection = styled.main`
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
`;

const TableContainer = styled.div`
  margin-bottom: 2rem;
  
  h3 {
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background-color: #f9f9f9;
    font-weight: 500;
  }
  
  .selected {
    background-color: #f0f3ff;
  }
  
  .low-credits {
    color: #e74c3c;
  }
  
  .warning {
    color: #e74c3c;
    font-size: 0.8rem;
  }
  
  .positive {
    color: #2ecc71;
    font-weight: 500;
  }
  
  .negative {
    color: #e74c3c;
    font-weight: 500;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &.select {
    background-color: #7c83fd;
    color: white;
    
    &:hover {
      background-color: #4e54c8;
    }
  }
  
  &.view {
    background-color: #f5f7fb;
    color: #333;
    
    &:hover {
      background-color: #e0e3f0;
    }
  }
`;

const RefreshButton = styled.button`
  padding: 6px 12px;
  background-color: #f5f7fb;
  color: #333;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #e0e3f0;
  }
`;

const FormContainer = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  
  h3 {
    margin-bottom: 1rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
`;

const CreditDisplay = styled.div`
  padding: 0.75rem;
  background-color: #f5f7fb;
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #4e54c8;
  
  &.low {
    color: #e74c3c;
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #7c83fd;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: #4e54c8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 5px;
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #d4edda;
  color: #155724;
  border-radius: 5px;
`;

const LoadingMessage = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #666;
`;

const EmptyMessage = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #666;
  font-style: italic;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const StatsCard = styled.div`
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  
  h3 {
    margin-bottom: 1rem;
    color: #333;
  }
`;

const StatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatsItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
`;

const StatLabel = styled.span`
  color: #666;
`;

const StatValue = styled.span`
  font-weight: 700;
  color: #333;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  button {
    flex-shrink: 0;
  }
`;

const HelpText = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.3rem;
`;

const Subsection = styled.div`
  margin-bottom: 2rem;
  
  h3 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #444;
  }
`;

export default Admin; 