const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// 환경 변수 설정
dotenv.config({ path: path.join(__dirname, '../.env') });

// 재설정할 계정 목록
const accountsToReset = [
  { username: 'admin', password: 'admin123' },
  { username: 'teacher1', password: 'teacher123' },
  { username: 'teacher2', password: 'teacher123' },
  { username: 'teacher3', password: 'teacher123' },
  { username: '1반학생01', password: 'student123' },
  { username: '1반학생06', password: 'student123' }
];

// MongoDB 연결 및 비밀번호 재설정
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    try {
      // 컬렉션 직접 접근
      const db = mongoose.connection.db;
      const users = db.collection('users');
      console.log('users 컬렉션 접근 성공');
      
      // 각 계정 비밀번호 재설정
      for (const account of accountsToReset) {
        // 비밀번호 해싱
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(account.password, salt);
        
        // 사용자 찾기 및 비밀번호 업데이트
        const result = await users.updateOne(
          { username: account.username }, 
          { $set: { password: hashedPassword } }
        );
        
        if (result.matchedCount > 0) {
          console.log(`${account.username} 계정의 비밀번호가 재설정되었습니다.`);
          console.log(`해시된 비밀번호: ${hashedPassword}`);
        } else {
          console.log(`${account.username} 계정을 찾을 수 없습니다.`);
        }
      }
      
      console.log('비밀번호 재설정이 완료되었습니다.');
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
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