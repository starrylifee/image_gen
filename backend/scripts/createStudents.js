const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 설정
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB 연결 및 학생 계정 생성
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    try {
      // 컬렉션 직접 접근
      const db = mongoose.connection.db;
      const users = db.collection('users');
      console.log('users 컬렉션 접근 성공');
      
      // 기존 학생 계정 삭제
      const deleteResult = await users.deleteMany({ role: 'student' });
      console.log('기존 학생 계정 삭제 완료:', deleteResult.deletedCount, '개 삭제됨');
      
      // 교사 ID 가져오기
      const teacher1 = await users.findOne({ username: 'teacher1' });
      const teacher2 = await users.findOne({ username: 'teacher2' });
      const teacher3 = await users.findOne({ username: 'teacher3' });
      
      if (!teacher1 || !teacher2 || !teacher3) {
        throw new Error('교사 계정을 찾을 수 없습니다. 먼저 createTeachers.js를 실행하세요.');
      }
      
      console.log('교사 ID 조회 성공:', teacher1._id, teacher2._id, teacher3._id);
      
      // 학생 계정 생성 함수
      const createStudents = async (teacherId, classroom, count) => {
        const students = [];
        for (let i = 1; i <= count; i++) {
          const studentNumber = i.toString().padStart(2, '0');
          students.push({
            username: `${classroom}학생${studentNumber}`,
            password: 'student123',
            name: `${classroom} 학생 ${studentNumber}호`,
            role: 'student',
            metadata: {
              classroom: classroom,
              teacherId: teacherId
            },
            createdAt: new Date()
          });
        }
        return students;
      };
      
      // 각 반 학생 생성
      const students1 = await createStudents(teacher1._id, '1반', 10);
      const students2 = await createStudents(teacher2._id, '2반', 21);
      const students3 = await createStudents(teacher3._id, '3반', 15);
      
      const allStudents = [...students1, ...students2, ...students3];
      
      // 학생 계정 추가
      const insertResult = await users.insertMany(allStudents);
      console.log('학생 계정 생성 완료:', insertResult.insertedCount, '개 생성됨');
      console.log('1반 학생:', students1.length, '명');
      console.log('2반 학생:', students2.length, '명');
      console.log('3반 학생:', students3.length, '명');
      
      // 전체 학생 수 확인
      const studentCount = await users.countDocuments({ role: 'student' });
      console.log('전체 학생 수:', studentCount);
      
      // 학생 계정 정보 출력
      console.log('\n학생 계정 정보 (샘플):');
      console.log('1반 학생: 1반학생01 / student123');
      console.log('2반 학생: 2반학생01 / student123');
      console.log('3반 학생: 3반학생01 / student123');
      
    } catch (error) {
      console.error('학생 계정 생성 오류:', error);
    } finally {
      // 연결 종료
      mongoose.disconnect();
      console.log('MongoDB 연결 종료');
    }
  })
  .catch(err => {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  }); 