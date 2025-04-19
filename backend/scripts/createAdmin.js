const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 설정
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB 연결 및 관리자 계정 생성
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
      
      // 기존 관리자 계정 확인
      const existingAdmin = await users.findOne({ role: 'admin' });
      
      if (existingAdmin) {
        console.log('기존 관리자 계정이 이미 존재합니다:', existingAdmin.username);
        console.log('관리자 계정 정보:');
        console.log(`아이디: ${existingAdmin.username}`);
        console.log(`이름: ${existingAdmin.name}`);
      } else {
        // 새 관리자 계정 추가
        const admin = {
          username: 'admin',
          password: 'admin123',
          name: '시스템 관리자',
          role: 'admin',
          createdAt: new Date()
        };
        
        const result = await users.insertOne(admin);
        console.log('관리자 계정 생성 완료:', result.insertedId);
        console.log('관리자 계정 정보:');
        console.log('아이디: admin / 비밀번호: admin123');
      }
    } catch (error) {
      console.error('관리자 계정 생성 오류:', error);
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