const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// 비밀번호를 재설정할 사용자 목록
const usersToReset = [
  '2반학생02',
  '2반학생03',
  '2반학생04',
  '2반학생05'
];

// 새 비밀번호
const newPassword = 'student123';

async function resetPasswords() {
  try {
    // MongoDB 연결
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval';
    console.log('MongoDB 연결 시도:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 연결 성공');
    
    for (const username of usersToReset) {
      try {
        // 사용자 찾기
        const user = await User.findOne({ username });
        
        if (!user) {
          console.log(`사용자 ${username}을(를) 찾을 수 없습니다`);
          continue;
        }
        
        // 비밀번호를 평문으로 설정 (로그인 시 자동 해싱됨)
        user.password = newPassword;
        await user.save();
        
        console.log(`사용자 ${username}의 비밀번호가 재설정되었습니다`);
      } catch (userError) {
        console.error(`사용자 ${username} 비밀번호 재설정 중 오류:`, userError);
      }
    }
    
    console.log('비밀번호 재설정 완료');
    
    // 연결 종료
    await mongoose.connection.close();
    console.log('MongoDB 연결 종료');
  } catch (error) {
    console.error('오류 발생:', error);
    
    // 연결 종료
    try {
      await mongoose.connection.close();
      console.log('MongoDB 연결 종료');
    } catch (closeError) {
      console.error('MongoDB 연결 종료 실패:', closeError);
    }
  }
}

// 스크립트 실행
resetPasswords(); 