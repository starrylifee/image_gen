const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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
      
      // 교사 계정 추가 - 비밀번호 해싱 없이 직접 저장
      const insertResult = await users.insertOne({
        username: 'teacher1',
        password: 'teacher123',  // 비밀번호를 평문으로 저장
        name: '김선생 (1반)',
        role: 'teacher',
        createdAt: new Date()
      });
      
      console.log('교사 계정 생성 완료:', insertResult.insertedId);
      console.log('교사 계정 정보: teacher1 / teacher123');
      
      // 현재 사용자 수 출력
      const count = await users.countDocuments();
      console.log('총 사용자 수:', count);
      
      // 생성된 교사 계정 확인
      const teacher = await users.findOne({ username: 'teacher1' });
      console.log('생성된 교사 계정:', teacher ? teacher.username : '없음');
      console.log('비밀번호:', teacher ? teacher.password : '없음');
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