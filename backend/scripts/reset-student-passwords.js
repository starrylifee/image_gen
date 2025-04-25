const mongoose = require('mongoose');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

// 비밀번호를 재설정할 사용자 목록
const usersToReset = [
  '2반학생01',
  '2반학생02',
  '2반학생03',
  '2반학생04',
  '2반학생05',
  '2반학생06',
  '2반학생07'
];

// 새 비밀번호
const newPassword = 'student123';

async function resetPasswords() {
  try {
    // MongoDB 연결 옵션 추가
    const options = {
      serverSelectionTimeoutMS: 30000, // 30초
      socketTimeoutMS: 45000, // 45초
      connectTimeoutMS: 30000, // 30초
    };
    
    // MongoDB 연결
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-generation-approval';
    console.log('MongoDB 연결 시도:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB 연결 성공');
    
    // 로그인 성공하는 계정의 비밀번호 해시 패턴 확인
    const successfulUser = await User.findOne({ username: '2반학생08' });
    if (successfulUser) {
      console.log('참조 계정 비밀번호 해시:', successfulUser.password.substring(0, 20) + '...');
    }
    
    for (const username of usersToReset) {
      try {
        // 사용자 찾기
        const user = await User.findOne({ username });
        
        if (!user) {
          console.log(`사용자 ${username}을(를) 찾을 수 없습니다`);
          continue;
        }
        
        console.log(`사용자 [${username}] 처리 중... 현재 비밀번호: ${user.password.substring(0, 15)}...`);
        
        // bcrypt로 비밀번호 해싱하기
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);
        
        // 직접 Update를 사용하여 비밀번호 업데이트 (pre-save 훅을 우회)
        const updateResult = await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        if (updateResult.modifiedCount === 1) {
          console.log(`사용자 ${username}의 비밀번호가 성공적으로 재설정되었습니다`);
        } else {
          console.log(`사용자 ${username}의 비밀번호 업데이트 실패`);
        }
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