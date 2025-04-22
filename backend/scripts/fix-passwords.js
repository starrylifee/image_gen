const mongoose = require('mongoose');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

async function fixPasswords() {
  try {
    // MongoDB 연결 옵션 추가 - 타임아웃 증가
    const options = {
      serverSelectionTimeoutMS: 30000, // 30초
      socketTimeoutMS: 45000, // 45초
      connectTimeoutMS: 30000, // 30초
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    // MongoDB Atlas 연결 문자열 직접 지정
    const MONGODB_URI = 'mongodb+srv://starrylife:wkatlffh62@cluster0.xp8dj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    console.log('MongoDB Atlas 연결 시도...');
    
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB Atlas 연결 성공');
    
    // 모든 사용자 조회
    const users = await User.find({});
    console.log(`총 ${users.length}명의 사용자를 확인합니다`);
    
    let hashedCount = 0;
    let alreadyHashedCount = 0;
    let plainTextCount = 0;
    let failedUpdates = 0;
    
    // 각 사용자의 비밀번호 확인 및 해싱
    for (const user of users) {
      try {
        console.log(`사용자 [${user.username}] 처리 중... 현재 비밀번호: ${user.password.substring(0, 10)}${user.password.length > 10 ? '...' : ''}`);
        
        const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
        
        // 평문 비밀번호 또는 짧은 비밀번호는 모두 처리
        if (!isHashed || user.password.length < 20) {
          plainTextCount++;
          console.log(`[${user.username}] 평문 비밀번호 발견: "${user.password}"`);
          
          // 비밀번호를 'student123'으로 통일
          const plainPassword = 'student123';
          const salt = await bcryptjs.genSalt(10);
          const hashedPassword = await bcryptjs.hash(plainPassword, salt);
          
          // 사용자 모델에서 직접 업데이트하지 않고 Mongoose 모델 사용
          const updateResult = await User.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
          );
          
          if (updateResult.modifiedCount === 1) {
            console.log(`[${user.username}] 비밀번호 해싱 완료 - DB 업데이트 성공`);
            hashedCount++;
          } else {
            console.log(`[${user.username}] 경고: 비밀번호 업데이트가 DB에 적용되지 않았습니다`);
            failedUpdates++;
          }
        } else {
          console.log(`[${user.username}] 이미 해싱된 비밀번호 발견`);
          alreadyHashedCount++;
        }
      } catch (userError) {
        console.error(`[${user.username}] 처리 중 오류 발생:`, userError);
        failedUpdates++;
      }
    }
    
    console.log('\n비밀번호 처리 결과:');
    console.log(`총 사용자: ${users.length}명`);
    console.log(`이미 해싱된 비밀번호: ${alreadyHashedCount}명`);
    console.log(`평문 비밀번호 발견: ${plainTextCount}명`);
    console.log(`새로 해싱한 비밀번호: ${hashedCount}명`);
    console.log(`실패한 업데이트: ${failedUpdates}명`);
    console.log(`모든 평문 비밀번호는 'student123'으로 설정하고 해싱했습니다.`);
    
    // 확인을 위해 다시 한번 사용자 조회
    console.log('\n업데이트 후 검증 중...');
    const updatedUsers = await User.find({});
    let stillPlainCount = 0;
    
    for (const user of updatedUsers) {
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
      if (!isHashed) {
        stillPlainCount++;
        console.log(`경고: [${user.username}]의 비밀번호가 여전히 평문입니다: "${user.password}"`);
      }
    }
    
    console.log(`검증 결과: ${stillPlainCount}명의 사용자가 여전히 평문 비밀번호를 사용 중입니다.`);
    console.log('MongoDB Atlas 업데이트 완료!');
    
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