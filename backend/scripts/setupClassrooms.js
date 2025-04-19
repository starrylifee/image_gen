/**
 * 3개 반(교사1-학생10명, 교사2-학생21명, 교사3-학생15명)을 생성하는 스크립트
 * 
 * 실행 방법: node scripts/setupClassrooms.js
 */

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 설정
dotenv.config({ path: path.join(__dirname, '../.env') });

// 모델 가져오기 - 수정: User 모델을 직접 사용하지 않고 MongoDB 컬렉션 접근
const User = require('../models/User');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval')
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  });

// 비밀번호 해싱
const hashPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

// 교실 데이터 정의
const classrooms = [
  { 
    teacherName: '김선생', 
    teacherUsername: 'teacher1',
    classroomName: '1반',
    studentCount: 10 
  },
  { 
    teacherName: '이선생', 
    teacherUsername: 'teacher2',
    classroomName: '2반',
    studentCount: 21 
  },
  { 
    teacherName: '박선생', 
    teacherUsername: 'teacher3',
    classroomName: '3반',
    studentCount: 15 
  }
];

// 교실 및 사용자 생성 함수
const setupClassrooms = async () => {
  try {
    // 기존 사용자 데이터 삭제
    await User.deleteMany({});
    console.log('기존 사용자 데이터 삭제 완료');

    // 관리자 계정 생성
    const adminPassword = 'admin123';
    const hashedAdminPassword = await hashPassword(adminPassword);
    
    await User.create({
      username: 'admin',
      password: hashedAdminPassword,
      name: '관리자',
      role: 'admin'
    });
    console.log('관리자 계정 생성 완료: admin / admin123');

    // 각 교실 생성
    for (const classroom of classrooms) {
      // 교사 계정 생성 - 교사 비밀번호 수정
      const teacherPassword = 'teacher123';
      const hashedTeacherPassword = await bcryptjs.hash(teacherPassword, 10);
      
      const teacher = await User.create({
        username: classroom.teacherUsername,
        password: hashedTeacherPassword,
        name: `${classroom.teacherName} (${classroom.classroomName})`,
        role: 'teacher'
      });
      
      console.log(`교사 계정 생성 완료: ${classroom.teacherUsername} / teacher123 - ${classroom.teacherName} (${classroom.classroomName})`);
      
      // 학생 계정 생성 - 학생 비밀번호 수정
      for (let i = 1; i <= classroom.studentCount; i++) {
        const studentNumber = i.toString().padStart(2, '0'); // 01, 02, ...
        const username = `${classroom.classroomName}학생${studentNumber}`;
        const studentPassword = 'student123';
        const hashedStudentPassword = await bcryptjs.hash(studentPassword, 10);
        
        await User.create({
          username,
          password: hashedStudentPassword,
          name: `${classroom.classroomName} 학생 ${studentNumber}호`,
          role: 'student',
          metadata: {
            classroom: classroom.classroomName,
            teacherId: teacher._id
          }
        });
      }
      
      console.log(`${classroom.classroomName} 학생 ${classroom.studentCount}명 생성 완료`);
    }
    
    console.log('모든 계정 생성 완료!');
    console.log('총 사용자 수:', await User.countDocuments());
    console.log('교사 수:', await User.countDocuments({ role: 'teacher' }));
    console.log('학생 수:', await User.countDocuments({ role: 'student' }));
    
    // 계정 정보 출력
    console.log('\n=== 로그인 계정 정보 ===');
    console.log('관리자: admin / admin123');
    console.log('교사1: teacher1 / teacher123');
    console.log('교사2: teacher2 / teacher123');
    console.log('교사3: teacher3 / teacher123');
    console.log('1반 학생: 1반학생01 / student123');
    console.log('2반 학생: 2반학생01 / student123');
    console.log('3반 학생: 3반학생01 / student123');
    
  } catch (error) {
    console.error('교실 설정 중 오류 발생:', error);
  } finally {
    // 연결 종료
    mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
};

// 스크립트 실행
setupClassrooms(); 