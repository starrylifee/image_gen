const mongoose = require('mongoose');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

async function fixPasswords() {
  try {
    // MongoDB 연결
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval';
    console.log('MongoDB 연결 시도:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 연결 성공');
    
    // 모든 사용자 조회
    const users = await User.find({});
    console.log(`총 ${users.length}명의 사용자를 확인합니다`);
    
    let hashedCount = 0;
    let alreadyHashedCount = 0;
    
    // 각 사용자의 비밀번호 확인 및 해싱
    for (const user of users) {
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      
      console.log(`[${user.username}] 비밀번호 확인: ${isHashed ? '이미 해싱됨' : '평문'}`);
      
      // 해싱되지 않은 비밀번호만 처리
      if (!isHashed) {
        const plainPassword = user.password;
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(plainPassword, salt);
        
        user.password = hashedPassword;
        await user.save();
        
        console.log(`[${user.username}] 비밀번호 해싱 완료`);
        hashedCount++;
      } else {
        alreadyHashedCount++;
      }
    }
    
    console.log('\n비밀번호 처리 결과:');
    console.log(`총 사용자: ${users.length}명`);
    console.log(`이미 해싱된 비밀번호: ${alreadyHashedCount}명`);
    console.log(`새로 해싱한 비밀번호: ${hashedCount}명`);
    
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
fixPasswords(); 