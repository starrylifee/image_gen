const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Prompt = require('../models/Prompt');
const Image = require('../models/Image');

// 학생 인증 미들웨어
const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 토큰이 필요합니다' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다' 
      });
    }
    
    if (user.role !== 'student' && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '학생 권한이 필요합니다' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('학생 인증 오류:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: '유효하지 않거나 만료된 토큰입니다' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: '인증 처리 중 오류가 발생했습니다' 
    });
  }
};

// 프롬프트 제출 라우트
router.post('/submit-prompt', authenticateStudent, async (req, res) => {
  try {
    // 클라이언트가 content 또는 prompt로 보낼 수 있도록 둘 다 처리
    const promptContent = req.body.prompt || req.body.content;
    
    if (!promptContent || promptContent.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '프롬프트 내용이 필요합니다' 
      });
    }
    
    // 이미 처리 중인 프롬프트가 있는지 확인
    const pendingPrompt = await Prompt.findOne({
      student: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });
    
    if (pendingPrompt) {
      return res.status(400).json({
        success: false,
        message: '이미 처리 중인 프롬프트가 있습니다. 처리가 완료된 후 다시 시도해주세요.'
      });
    }
    
    // 새 프롬프트 생성
    const newPrompt = new Prompt({
      content: promptContent,
      student: req.user._id,
      status: 'pending'
    });
    
    await newPrompt.save();
    
    console.log('새 프롬프트 저장됨:', newPrompt._id, '내용:', promptContent.substring(0, 30));
    
    // 소켓을 통해 교사에게 새 프롬프트 알림
    if (req.io) {
      console.log('소켓 이벤트 전송: new_prompt_submitted');
      
      req.io.emit('new_prompt_submitted', {
        _id: newPrompt._id,
        content: newPrompt.content,
        student: {
          _id: req.user._id,
          name: req.user.name,
          username: req.user.username
        },
        createdAt: newPrompt.createdAt
      });
    } else {
      console.log('소켓 객체가 없습니다! io 객체가 req에 연결되지 않음');
    }
    
    res.status(201).json({
      success: true,
      message: '프롬프트가 성공적으로 제출되었습니다',
      promptId: newPrompt._id
    });
  } catch (error) {
    console.error('프롬프트 제출 오류:', error);
    res.status(500).json({
      success: false,
      message: '프롬프트 제출 중 오류가 발생했습니다'
    });
  }
});

// 학생 상태 조회 - 프롬프트 및 이미지 정보
router.get('/status', authenticateStudent, async (req, res) => {
  try {
    // 현재 로그인한 학생 정보 사용
    const studentId = req.user._id;
    console.log(`사용자 ID: ${studentId} 에 대한 상태 조회`);

    // 학생이 제출한 대기 중인 프롬프트 및 승인된 이미지 조회
    const pendingPrompts = await Prompt.find({
      student: studentId,
      status: { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 });

    // 승인된 이미지 조회
    const approvedImages = await Image.find({
      student: studentId,
      status: 'approved'
    }).populate('prompt').sort({ createdAt: -1 });

    // 교실 정보 로그 추가
    if (req.user.metadata && req.user.metadata.classroom) {
      console.log(`${req.user.metadata.classroom} 학생 상태 조회: ${pendingPrompts.length} 프롬프트, ${approvedImages.length} 이미지`);
    }

    // 이미지 경로 변환
    const formattedImages = approvedImages.map(img => {
      const imageObj = img.toObject();
      
      // 이미지 경로가 /uploads로 시작하지 않도록 수정
      if (imageObj.path) {
        imageObj.path = imageObj.path.startsWith('/') 
          ? imageObj.path 
          : `/${imageObj.path}`;
      }
      
      return imageObj;
    });

    res.json({
      success: true,
      pendingPrompts,
      approvedImages: formattedImages
    });
  } catch (error) {
    console.error('학생 상태 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '상태 조회 중 오류가 발생했습니다' 
    });
  }
});

module.exports = router; 