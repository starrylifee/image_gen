const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// 환경 변수 설정
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB 연결 및 테스트 교사 계정 생성
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    try {
      // 컬렉션 직접 접근
      const db = mongoose.connection.db;
      
      // 컬렉션 확인
      const collections = await db.listCollections().toArray();
      console.log('데이터베이스 컬렉션 목록:', collections.map(c => c.name).join(', '));
      
      const users = db.collection('users');
      console.log('users 컬렉션 접근 성공');
      
      // 기존 교사 계정 삭제
      const deleteResult = await users.deleteMany({ role: 'teacher' });
      console.log('기존 교사 계정 삭제 완료:', deleteResult.deletedCount, '개 삭제됨');
      
      // 비밀번호 해싱
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('teacher123', salt);
      console.log('교사 비밀번호 해싱 완료:', hashedPassword);
      
      // 교사 계정 추가 - 해시된 비밀번호 사용
      const teachers = [
        {
          username: 'teacher1',
          password: hashedPassword,
          name: '김선생 (1반)',
          role: 'teacher',
          credits: 10, // 초기 크레딧 10
          metadata: {
            classroom: '1반'
          },
          createdAt: new Date()
        },
        {
          username: 'teacher2',
          password: hashedPassword,
          name: '이선생 (2반)',
          role: 'teacher',
          credits: 5, // 초기 크레딧 5
          metadata: {
            classroom: '2반'
          },
          createdAt: new Date()
        },
        {
          username: 'teacher3',
          password: hashedPassword,
          name: '박선생 (3반)',
          role: 'teacher',
          credits: 0, // 초기 크레딧 0
          metadata: {
            classroom: '3반'
          },
          createdAt: new Date()
        }
      ];
      
      const insertResult = await users.insertMany(teachers);
      console.log('교사 계정 생성 완료:', insertResult.insertedCount, '개 생성됨');
      
      // 교사 ID 조회
      const teacher1 = await users.findOne({ username: 'teacher1' });
      const teacher2 = await users.findOne({ username: 'teacher2' });
      const teacher3 = await users.findOne({ username: 'teacher3' });
      
      console.log('교사1 ID:', teacher1._id);
      console.log('교사2 ID:', teacher2._id);
      console.log('교사3 ID:', teacher3._id);
      
      console.log('교사 계정 정보:');
      console.log('교사1: teacher1 / teacher123 - 1반');
      console.log('교사2: teacher2 / teacher123 - 2반');
      console.log('교사3: teacher3 / teacher123 - 3반');
      
      // 현재 사용자 수 출력
      const count = await users.countDocuments();
      console.log('총 사용자 수:', count);
    } catch (error) {
      console.error('교사 계정 생성 오류:', error);
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