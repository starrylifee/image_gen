const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const router = express.Router();

// 로그인 라우트
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('로그인 요청 받음:', { username });
    console.log('입력된 비밀번호 길이:', password ? password.length : 0);

    // 사용자 이름으로 사용자 찾기
    const user = await User.findOne({ username });
    console.log('사용자 찾음:', user ? '사용자 있음' : '사용자 없음');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '사용자 이름 또는 비밀번호가 올바르지 않습니다'
      });
    }

    // 비밀번호 확인 - 해시 비교만 사용
    console.log('저장된 비밀번호:', user.password);
    console.log('저장된 비밀번호 길이:', user.password.length);
    
    // 비밀번호 검증
    let isMatch = false;
    
    // 해시된 비밀번호인지 확인 (bcrypt 해시는 $2a$, $2b$ 또는 $2y$로 시작)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    console.log('비밀번호 해싱 여부:', isHashed ? '해싱됨' : '해싱되지 않음');
    
    if (isHashed) {
      try {
        // bcryptjs로 비교
        console.log('bcryptjs로 비밀번호 비교 시도');
        isMatch = await bcryptjs.compare(password, user.password);
        console.log('bcryptjs 비교 결과:', isMatch);
      } catch (compareError) {
        console.error('비밀번호 비교 오류:', compareError);
      }
    } else {
      // 해싱되지 않은 경우 직접 비교
      console.log('평문 비밀번호 직접 비교 시도');
      isMatch = (password === user.password);
      console.log('직접 비교 결과:', isMatch);
      
      // 로그인 성공 시 비밀번호 해싱 후 업데이트 (보안 강화)
      if (isMatch) {
        try {
          console.log('비밀번호 해싱 및 저장 시도');
          const salt = await bcryptjs.genSalt(10);
          const hashedPassword = await bcryptjs.hash(password, salt);
          
          // 사용자 비밀번호 업데이트
          user.password = hashedPassword;
          await user.save();
          console.log('사용자 비밀번호 해싱 업데이트 완료');
        } catch (hashError) {
          console.error('비밀번호 해싱 업데이트 오류:', hashError);
          // 해싱 실패해도 로그인은 진행
        }
      }
    }
    
    console.log('최종 비밀번호 일치 여부:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '사용자 이름 또는 비밀번호가 올바르지 않습니다'
      });
    }

    // 로그인 성공 - 마지막 로그인 시간 업데이트
    user.lastLogin = Date.now();
    await user.save();

    // 토큰 생성
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_jwt_secret',
      { expiresIn: '1d' }
    );

    // 사용자 데이터에서 비밀번호 제외
    const userData = user.toObject();
    delete userData.password;

    // 응답
    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다'
    });
  }
});

// 토큰 검증 라우트
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '토큰이 제공되지 않았습니다'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 토큰입니다'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '토큰 검증 중 오류가 발생했습니다'
    });
  }
});

// 회원가입 라우트
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role = 'student' } = req.body;

    // 필수 필드 확인
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '사용자명, 비밀번호, 이름은 필수 항목입니다'
      });
    }

    // 중복 사용자 확인
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다'
      });
    }

    // 새 사용자 직접 생성 (bcrypt 사용하지 않음)
    const plainPassword = password;
    const saltRounds = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(plainPassword, saltRounds);
    
    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      role: role === 'admin' ? 'student' : role // admin 역할은 API로 설정 불가
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        _id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다'
    });
  }
});

// 디버깅용: 모든 사용자 목록 조회
router.get('/all-users', async (req, res) => {
  try {
    console.log('사용자 목록 조회 요청 받음');
    
    // 모든 사용자 조회 (비밀번호 제외)
    const users = await User.find({}).select('-password');
    console.log('조회된 사용자 수:', users.length);
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

module.exports = router; 