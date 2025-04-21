const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Prompt = require('../models/Prompt');
const Image = require('../models/Image');
const { generateImage, evaluateImageSafety, startBatchProcessing, getBatchStatus } = require('../services/imageService');
const bcryptjs = require('bcryptjs');

// 교사 인증 미들웨어
const authenticateTeacher = async (req, res, next) => {
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
    
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '교사 권한이 필요합니다' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('교사 인증 오류:', error);
    
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

// 승인 대기 중인 프롬프트 목록 조회
router.get('/pending-prompts', authenticateTeacher, async (req, res) => {
  try {
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 해당 교사에게 배정된 학생 ID 목록 조회
    let studentIds = [];
    
    // 교사에게 직접 할당된 학생이 있는 경우
    if (req.user.metadata && req.user.metadata.studentIds && req.user.metadata.studentIds.length > 0) {
      studentIds = req.user.metadata.studentIds;
    } else {
      // 해당 교사를 참조하는 모든 학생 조회
      const students = await User.find({
        role: 'student',
        'metadata.teacherId': teacherId
      });
      
      studentIds = students.map(student => student._id);
    }
    
    // 교실 정보 로깅
    const classroomInfo = req.user.metadata && req.user.metadata.classroom 
      ? req.user.metadata.classroom 
      : '미지정';
    
    console.log(`${req.user.name} 교사(${classroomInfo}) - 학생 ${studentIds.length}명의 프롬프트 조회`);
    
    // 교사가 관리하는 학생들의 프롬프트만 조회
    const query = { status: 'pending' };
    
    // 관리자가 아닌 경우 학생 필터링 적용
    if (req.user.role !== 'admin' && studentIds.length > 0) {
      query.student = { $in: studentIds };
    }
    
    const pendingPrompts = await Prompt.find(query)
      .populate('student', 'name username metadata')
      .sort({ createdAt: 1 });
    
    console.log(`대기 중인 프롬프트 ${pendingPrompts.length}개 조회됨`);
    
    res.json({
      success: true,
      prompts: pendingPrompts
    });
  } catch (error) {
    console.error('대기 중인 프롬프트 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '프롬프트 목록 조회 중 오류가 발생했습니다' 
    });
  }
});

// 승인 대기 중인 이미지 목록 조회
router.get('/pending-images', authenticateTeacher, async (req, res) => {
  try {
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 해당 교사에게 배정된 학생 ID 목록 조회
    let studentIds = [];
    
    // 교사에게 직접 할당된 학생이 있는 경우
    if (req.user.metadata && req.user.metadata.studentIds && req.user.metadata.studentIds.length > 0) {
      studentIds = req.user.metadata.studentIds;
    } else {
      // 해당 교사를 참조하는 모든 학생 조회
      const students = await User.find({
        role: 'student',
        'metadata.teacherId': teacherId
      });
      
      studentIds = students.map(student => student._id);
    }
    
    // 교실 정보 로깅
    const classroomInfo = req.user.metadata && req.user.metadata.classroom 
      ? req.user.metadata.classroom 
      : '미지정';
    
    console.log(`${req.user.name} 교사(${classroomInfo}) - 학생 ${studentIds.length}명의 이미지 조회`);
    
    // 교사가 관리하는 학생들의 이미지만 조회
    const query = { status: 'pending' };
    
    // 관리자가 아닌 경우 학생 필터링 적용
    if (req.user.role !== 'admin' && studentIds.length > 0) {
      query.student = { $in: studentIds };
    }
    
    const pendingImages = await Image.find(query)
      .populate('student', 'name username metadata')
      .populate('prompt', 'content')
      .sort({ createdAt: 1 });
    
    // 이미지 경로 변환 - 외부 URL과 내부 경로 구분 처리
    const formattedImages = pendingImages.map(img => {
      const imageObj = img.toObject();
      
      // URL 형식인지 확인 (http 또는 https로 시작하는지)
      const isExternalUrl = imageObj.path && (
        imageObj.path.startsWith('http://') || 
        imageObj.path.startsWith('https://')
      );
      
      if (isExternalUrl) {
        // 외부 URL인 경우 그대로 사용
        return {
          ...imageObj,
          isExternalUrl: true,
          displayUrl: imageObj.path // 표시용 URL
        };
      } else {
        // 내부 파일인 경우 /uploads 경로 추가
        const imagePath = imageObj.path.startsWith('/') 
          ? `/uploads${imageObj.path}` 
          : `/uploads/${imageObj.path}`;
        
        return {
          ...imageObj,
          isExternalUrl: false,
          path: imagePath,
          originalPath: imageObj.path // 디버깅용으로 원본 경로도 포함
        };
      }
    });
    
    console.log(`대기 중인 이미지 ${formattedImages.length}개 조회됨`);
    if (formattedImages.length > 0) {
      console.log('첫 번째 이미지 경로:', formattedImages[0].isExternalUrl ? 
        '외부 URL: ' + formattedImages[0].displayUrl.substring(0, 50) + '...' : 
        formattedImages[0].path);
    }
    
    // 일관된 응답 형식 유지 - 객체 형태로 반환
    res.json({
      success: true,
      images: formattedImages
    });
  } catch (error) {
    console.error('대기 중인 이미지 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '이미지 목록 조회 중 오류가 발생했습니다' 
    });
  }
});

// 프롬프트 승인/거부 처리
router.post('/process-prompt', authenticateTeacher, async (req, res) => {
  try {
    const { promptId, status, rejectionReason } = req.body;
    
    if (!promptId) {
      return res.status(400).json({ 
        success: false, 
        message: '프롬프트 ID가 필요합니다' 
      });
    }
    
    const prompt = await Prompt.findById(promptId);
    
    if (!prompt) {
      return res.status(404).json({ 
        success: false, 
        message: '프롬프트를 찾을 수 없습니다' 
      });
    }
    
    if (prompt.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 처리된 프롬프트입니다' 
      });
    }
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: '유효한 상태값이 아닙니다. approved 또는 rejected를 사용하세요.'
      });
    }
    
    // 상태 확인 및 설정
    prompt.status = status;
    prompt.reviewedBy = req.user._id;
    prompt.reviewedAt = Date.now();
    
    if (status === 'rejected' && rejectionReason) {
      prompt.rejectionReason = rejectionReason;
    }
    
    await prompt.save();
    
    // 프롬프트가 승인된 경우 이미지 생성 시작
    if (status === 'approved') {
      try {
        // 교사의 크레딧 확인
        const teacher = await User.findById(req.user._id);
        
        // 크레딧이 부족한 경우
        if (teacher.credits < 1) {
          return res.status(400).json({
            success: false,
            message: '크레딧이 부족하여 이미지를 생성할 수 없습니다',
            credits: teacher.credits,
            neededCredits: 1
          });
        }
        
        // 크레딧 차감
        teacher.credits -= 1;
        teacher.creditHistory.push({
          amount: -1,
          reason: `이미지 생성: ${prompt.content.substring(0, 30)}${prompt.content.length > 30 ? '...' : ''}`,
          timestamp: new Date()
        });
        
        await teacher.save();
        
        console.log(`교사 ${teacher.name}(${teacher.username})의 크레딧이 1 차감되었습니다. 현재 잔액: ${teacher.credits}`);
        
        // 이미지 생성 서비스 호출 (URL 반환)
        const imageUrl = await generateImage(prompt.content);
        
        // 이미지 안전성 평가
        const safetyLevel = await evaluateImageSafety(imageUrl);
        
        // 생성된 이미지 저장
        const newImage = new Image({
          path: imageUrl,
          isExternalUrl: true,  // 외부 URL임을 표시
          prompt: prompt._id,
          student: prompt.student,
          status: 'pending',
          safetyLevel
        });
        
        await newImage.save();
        
        // 프롬프트 상태 업데이트
        prompt.generatedImage = newImage._id;
        await prompt.save();
        
        // 소켓을 통해 교사에게 새 이미지 알림
        if (req.io) {
          const student = await User.findById(prompt.student);
          
          req.io.emit('imageGenerated', {
            _id: newImage._id,
            path: imageUrl,  // URL 직접 전달
            isExternalUrl: true,
            prompt: {
              _id: prompt._id,
              content: prompt.content
            },
            student: {
              _id: student._id,
              name: student.name,
              username: student.username
            },
            safetyLevel: newImage.safetyLevel,
            createdAt: newImage.createdAt
          });
        }
      } catch (error) {
        console.error('이미지 생성 오류:', error);
        
        // 이미지 생성에 실패한 경우에도 프롬프트 상태를 업데이트
        try {
          // 프롬프트 상태를 'processed'로 변경
          prompt.status = 'processed';
          await prompt.save();
          
          // 소켓을 통해 학생에게 오류 알림
          if (req.io) {
            req.io.emit('promptProcessed', {
              promptId: prompt._id,
              studentId: prompt.student,
              status: 'processed',
              message: '이미지 생성 중 오류가 발생했습니다'
            });
          }
          
          console.log(`프롬프트 ID: ${prompt._id}의 상태를 'processed'로 변경했습니다. (이미지 생성 실패)`);
        } catch (updateError) {
          console.error('프롬프트 상태 업데이트 오류:', updateError);
        }
      }
    } else if (status === 'rejected') {
      // 거부된 경우 소켓을 통해 학생에게 알림
      if (req.io) {
        req.io.emit('promptRejected', {
          promptId: prompt._id,
          studentId: prompt.student
        });
      }
    }
    
    res.json({
      success: true,
      message: status === 'approved' ? '프롬프트가 승인되었습니다' : '프롬프트가 거부되었습니다'
    });
  } catch (error) {
    console.error('프롬프트 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '프롬프트 처리 중 오류가 발생했습니다' 
    });
  }
});

// 이미지 승인/거부 처리
router.post('/process-image', authenticateTeacher, async (req, res) => {
  try {
    const { imageId, status, rejectionReason } = req.body;
    
    if (!imageId) {
      return res.status(400).json({ 
        success: false, 
        message: '이미지 ID가 필요합니다' 
      });
    }
    
    const image = await Image.findById(imageId);
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: '이미지를 찾을 수 없습니다' 
      });
    }
    
    if (image.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 처리된 이미지입니다' 
      });
    }
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: '유효한 상태값이 아닙니다. approved 또는 rejected를 사용하세요.'
      });
    }
    
    // 상태 설정
    image.status = status;
    image.reviewedBy = req.user._id;
    image.reviewedAt = Date.now();
    
    if (status === 'rejected' && rejectionReason) {
      image.rejectionReason = rejectionReason;
    }
    
    await image.save();
    
    // 관련 프롬프트 상태 업데이트
    const prompt = await Prompt.findById(image.prompt);
    if (prompt) {
      prompt.status = 'processed';
      await prompt.save();
    }
    
    // 소켓을 통해 학생에게 알림
    if (req.io) {
      if (status === 'approved') {
        // 외부 URL인 경우 그대로 전달, 아닌 경우 /uploads/ 경로 추가
        const imageUrl = image.isExternalUrl 
          ? image.path 
          : `/uploads/${image.path}`;
        
        req.io.emit('imageApproved', {
          imageId: image._id,
          studentId: image.student,
          imageUrl: imageUrl
        });
      } else if (status === 'rejected') {
        req.io.emit('imageRejected', {
          imageId: image._id,
          studentId: image.student
        });
      }
    }
    
    res.json({
      success: true,
      message: status === 'approved' ? '이미지가 승인되었습니다' : '이미지가 거부되었습니다'
    });
  } catch (error) {
    console.error('이미지 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '이미지 처리 중 오류가 발생했습니다' 
    });
  }
});

// 학생 계정 생성 API
router.post('/create-students', authenticateTeacher, async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: '최소 한 명 이상의 학생 정보가 필요합니다'
      });
    }
    
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 교사 정보에서 교실 정보 가져오기
    const teacherClassroom = req.user.metadata?.classroom || '미지정 반';
    
    // 결과 통계
    const results = {
      createdCount: 0,
      failedCount: 0,
      failedStudents: []
    };
    
    // 각 학생 정보를 처리하여 계정 생성
    for (const student of students) {
      try {
        // 필수 필드 검증
        if (!student.username || !student.name) {
          results.failedCount++;
          results.failedStudents.push({
            username: student.username || '미입력',
            reason: '아이디 또는 이름이 비어있습니다'
          });
          continue;
        }
        
        // 중복 아이디 확인
        const existingUser = await User.findOne({ username: student.username });
        if (existingUser) {
          results.failedCount++;
          results.failedStudents.push({
            username: student.username,
            reason: '이미 존재하는 아이디입니다'
          });
          continue;
        }
        
        // 기본 비밀번호 설정
        const password = student.password || 'student123';
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);
        
        // 학생 계정 생성
        await User.create({
          username: student.username,
          password: hashedPassword,
          name: student.name,
          role: 'student',
          metadata: {
            classroom: student.classroom || teacherClassroom,
            teacherId: teacherId
          }
        });
        
        results.createdCount++;
      } catch (error) {
        console.error('학생 계정 생성 중 오류:', error);
        results.failedCount++;
        results.failedStudents.push({
          username: student.username || '알 수 없음',
          reason: error.message || '알 수 없는 오류'
        });
      }
    }
    
    // 결과 반환
    res.status(201).json({
      success: true,
      message: `${results.createdCount}명의 학생 계정이 생성되었습니다`,
      ...results
    });
  } catch (error) {
    console.error('학생 계정 생성 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '학생 계정 생성 중 서버 오류가 발생했습니다'
    });
  }
});

// 교사가 담당하는 학생 목록 조회
router.get('/my-students', authenticateTeacher, async (req, res) => {
  try {
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 해당 교사에게 배정된 학생 목록 조회
    const students = await User.find({
      role: 'student',
      'metadata.teacherId': teacherId
    }).select('_id username name metadata.classroom createdAt');
    
    // 교실 정보 로깅
    const classroomInfo = req.user.metadata && req.user.metadata.classroom 
      ? req.user.metadata.classroom 
      : '미지정';
    
    console.log(`${req.user.name} 교사(${classroomInfo})의 학생 목록 조회: ${students.length}명`);
    
    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('학생 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학생 목록 조회 중 오류가 발생했습니다' 
    });
  }
});

// 학생 비밀번호 재설정
router.post('/reset-password', authenticateTeacher, async (req, res) => {
  try {
    const { studentId, newPassword } = req.body;
    
    if (!studentId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '학생 ID와 새 비밀번호가 필요합니다'
      });
    }
    
    // 비밀번호 복잡성 검사
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다'
      });
    }
    
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 학생 정보 조회 및 권한 확인
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      'metadata.teacherId': teacherId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없거나 해당 학생을 관리할 권한이 없습니다'
      });
    }
    
    // 비밀번호 업데이트 (평문으로 저장)
    student.password = newPassword;
    await student.save();
    
    console.log(`학생 ${student.name}(${student.username})의 비밀번호가 변경되었습니다`);
    
    res.json({
      success: true,
      message: `학생 ${student.name}의 비밀번호가 변경되었습니다`
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '비밀번호 변경 중 오류가 발생했습니다' 
    });
  }
});

// 학생 삭제
router.delete('/delete-student/:studentId', authenticateTeacher, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학생 ID가 필요합니다'
      });
    }
    
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 학생 정보 조회 및 권한 확인
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      'metadata.teacherId': teacherId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없거나 해당 학생을 관리할 권한이 없습니다'
      });
    }
    
    // 학생 계정 삭제
    await User.deleteOne({ _id: studentId });
    
    // 학생과 관련된 프롬프트 및 이미지 삭제
    await Prompt.deleteMany({ student: studentId });
    await Image.deleteMany({ student: studentId });
    
    console.log(`학생 ${student.name}(${student.username})의 계정이 삭제되었습니다`);
    
    res.json({
      success: true,
      message: `학생 ${student.name}의 계정이 삭제되었습니다`
    });
  } catch (error) {
    console.error('학생 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학생 삭제 중 오류가 발생했습니다' 
    });
  }
});

// 교사의 현재 크레딧 정보 조회
router.get('/credits', authenticateTeacher, async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // 최신 교사 정보 조회
    const teacher = await User.findById(teacherId)
      .select('_id username name credits');
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사 정보를 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      credits: teacher.credits
    });
  } catch (error) {
    console.error('크레딧 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '크레딧 정보 조회 중 오류가 발생했습니다'
    });
  }
});

// 교사의 크레딧 사용 내역 조회
router.get('/credit-history', authenticateTeacher, async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // 교사 및 크레딧 내역 조회
    const teacher = await User.findById(teacherId)
      .select('credits creditHistory');
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사 정보를 찾을 수 없습니다'
      });
    }
    
    // 크레딧 내역 날짜 기준 정렬
    const sortedHistory = [...teacher.creditHistory]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      credits: teacher.credits,
      history: sortedHistory
    });
  } catch (error) {
    console.error('크레딧 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '크레딧 내역 조회 중 오류가 발생했습니다'
    });
  }
});

// 일괄 프롬프트 처리 라우트
router.post('/batch-process-prompts', authenticateTeacher, async (req, res) => {
  try {
    // 교사 ID 가져오기
    const teacherId = req.user._id;
    
    // 해당 교사에게 배정된 학생 ID 목록 조회
    let studentIds = [];
    
    // 교사에게 직접 할당된 학생이 있는 경우
    if (req.user.metadata && req.user.metadata.studentIds && req.user.metadata.studentIds.length > 0) {
      studentIds = req.user.metadata.studentIds;
    } else {
      // 해당 교사를 참조하는 모든 학생 조회
      const students = await User.find({
        role: 'student',
        'metadata.teacherId': teacherId
      });
      
      studentIds = students.map(student => student._id);
    }
    
    // 승인할 프롬프트 목록 조회
    const query = { status: 'pending' };
    
    // 관리자가 아닌 경우 학생 필터링 적용
    if (req.user.role !== 'admin' && studentIds.length > 0) {
      query.student = { $in: studentIds };
    }
    
    // 요청에서 특정 프롬프트 ID들이 전달된 경우 해당 프롬프트만 처리
    if (req.body.promptIds && Array.isArray(req.body.promptIds) && req.body.promptIds.length > 0) {
      query._id = { $in: req.body.promptIds };
    }
    
    const pendingPrompts = await Prompt.find(query)
      .populate('student', 'name username')
      .sort({ createdAt: 1 });
    
    if (pendingPrompts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '처리할 프롬프트가 없습니다'
      });
    }
    
    console.log(`일괄 처리할 프롬프트 수: ${pendingPrompts.length}`);
    
    // 교사 크레딧 확인
    if (req.user.credits < pendingPrompts.length) {
      return res.status(400).json({
        success: false,
        message: `크레딧이 부족합니다. 필요: ${pendingPrompts.length}, 보유: ${req.user.credits}`,
        credits: req.user.credits,
        neededCredits: pendingPrompts.length
      });
    }
    
    // 일괄 처리 시작
    startBatchProcessing(pendingPrompts.length);
    
    // 비동기 처리 시작 (응답은 먼저 보내고 백그라운드에서 처리)
    res.status(202).json({
      success: true,
      message: `${pendingPrompts.length}개의 프롬프트 일괄 처리가 시작되었습니다`,
      batchId: Date.now().toString(),
      totalPrompts: pendingPrompts.length
    });
    
    // 각 프롬프트에 대한 비동기 처리
    (async () => {
      let successCount = 0;
      let errorCount = 0;
      
      // 크레딧 차감
      req.user.credits -= pendingPrompts.length;
      await req.user.save();
      
      // 각 프롬프트 순차 처리
      for (const prompt of pendingPrompts) {
        try {
          // 프롬프트 상태 업데이트
          prompt.status = 'approved';
          prompt.reviewedBy = req.user._id;
          prompt.reviewedAt = Date.now();
          await prompt.save();
          
          // 소켓을 통해 승인 알림
          if (req.io) {
            req.io.emit('promptApproved', {
              promptId: prompt._id,
              studentId: prompt.student._id
            });
          }
          
          console.log(`[일괄 처리] 프롬프트 승인: ${prompt._id}`);
          
          // 이미지 생성
          try {
            const imageUrl = await generateImage(prompt.content, true); // true = 일괄 처리 작업
            const safetyLevel = await evaluateImageSafety(imageUrl);
            
            // 이미지 정보 저장
            const newImage = new Image({
              path: imageUrl,
              isExternalUrl: true,
              prompt: prompt._id,
              student: prompt.student._id,
              status: 'pending',
              safetyLevel
            });
            
            await newImage.save();
            
            // 프롬프트와 이미지 연결
            prompt.generatedImage = newImage._id;
            await prompt.save();
            
            console.log(`[일괄 처리] 이미지 생성 완료: ${newImage._id} (프롬프트: ${prompt._id})`);
            
            successCount++;
          } catch (imageError) {
            console.error(`[일괄 처리] 이미지 생성 실패 (프롬프트: ${prompt._id}):`, imageError);
            errorCount++;
          }
        } catch (promptError) {
          console.error(`[일괄 처리] 프롬프트 처리 오류 (${prompt._id}):`, promptError);
          errorCount++;
        }
      }
      
      console.log(`[일괄 처리] 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
      
      // 완료 이벤트 전송
      if (req.io) {
        req.io.emit('batchProcessingCompleted', {
          teacherId: req.user._id,
          totalProcessed: pendingPrompts.length,
          successCount,
          errorCount
        });
      }
    })().catch(error => {
      console.error('[일괄 처리] 비동기 처리 중 오류 발생:', error);
    });
  } catch (error) {
    console.error('일괄 프롬프트 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '일괄 처리 중 오류가 발생했습니다'
    });
  }
});

// 일괄 처리 상태 조회 라우트
router.get('/batch-status', authenticateTeacher, (req, res) => {
  try {
    const status = getBatchStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('일괄 처리 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '상태 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router; 