import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f5f5f5;
    font-weight: 600;
  }

  tr:hover {
    background-color: #f8f9fa;
  }
`;

const Button = styled.button`
  padding: 6px 12px;
  margin: 0 4px;
  color: white;

  &.edit {
    background-color: #4285f4;
  }

  &.delete {
    background-color: #f44336;
  }
`;

const Select = styled.select`
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
`;

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('사용자 목록 로딩 오류:', error);
      setError('사용자 목록을 불러오는 중 오류가 발생했습니다');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (error) {
      console.error('역할 변경 오류:', error);
      setError('사용자 역할을 변경하는 중 오류가 발생했습니다');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      setError('사용자를 삭제하는 중 오류가 발생했습니다');
    }
  };

  return (
    <PageContainer>
      <Title>관리자 페이지</Title>
      
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

      <Section>
        <h2>사용자 관리</h2>
        <Table>
          <thead>
            <tr>
              <th>이름</th>
              <th>사용자명</th>
              <th>역할</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.username}</td>
                <td>
                  <Select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                  >
                    <option value="student">학생</option>
                    <option value="teacher">교사</option>
                    <option value="admin">관리자</option>
                  </Select>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : '없음'}
                </td>
                <td>
                  <Button
                    className="delete"
                    onClick={() => handleDeleteUser(user._id)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </PageContainer>
  );
}

export default AdminPage; 