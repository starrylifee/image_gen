const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Prompt = require('../models/Prompt');
const Image = require('../models/Image');
const { generateImage, evaluateImageSafety, startBatchProcessing, getBatchStatus } = require('../services/imageService');
const bcryptjs = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// 이미지 저장 경로 설정 (예: backend/uploads)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 이미지 다운로드 및 저장 함수
const downloadAndSaveImage = async (imageUrl, promptId) => {
  const UPLOAD_DIR_LOCAL = path.join(__dirname, '..', 'uploads'); // 저장 디렉토리 경로 재확인
  const filename = `${promptId}_${Date.now()}.png`;
  const savePath = path.join(UPLOAD_DIR_LOCAL, filename);

  console.log(`[downloadAndSaveImage] 저장 시도 경로: ${savePath}`); // 저장 경로 로그 추가

  try {
    if (!fs.existsSync(UPLOAD_DIR_LOCAL)) {
      console.log(`[downloadAndSaveImage] 업로드 디렉토리 없음, 생성 시도: ${UPLOAD_DIR_LOCAL}`);
      fs.mkdirSync(UPLOAD_DIR_LOCAL, { recursive: true });
      console.log(`[downloadAndSaveImage] 업로드 디렉토리 생성 완료: ${UPLOAD_DIR_LOCAL}`);
    }

    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(savePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`[downloadAndSaveImage] 파일 쓰기 완료: ${savePath}`); // 쓰기 완료 로그 추가
        resolve(`/uploads/${filename}`); // 서버 내부 경로 반환
      });
      writer.on('error', (err) => {
        console.error(`[downloadAndSaveImage] 파일 쓰기 오류: ${savePath}`, err); // 쓰기 오류 로그 추가
        reject(err);
      });
    });
  } catch (error) {
    console.error(`[downloadAndSaveImage] 이미지 다운로드 또는 저장 중 오류 발생 (경로: ${savePath}):`, error);
    throw new Error('이미지를 서버에 저장하는 중 오류 발생');
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
        // 내부 파일인 경우 DB에 저장된 경로 그대로 사용
        // const imagePath = imageObj.path.startsWith('/') 
        //  ? `/uploads${imageObj.path}` 
        //  : `/uploads/${imageObj.path}`;
        
        return {
          ...imageObj,
          isExternalUrl: false,
          path: imageObj.path, // DB 경로 그대로 사용
          originalPath: imageObj.path // 디버깅용 원본 경로 유지
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
    
    const prompt = await Prompt.findById(promptId).populate('student', '_id');
    
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
        const tempImageUrl = await generateImage(prompt.content);
        
        // 생성된 이미지를 다운로드하여 서버에 저장
        const localImagePath = await downloadAndSaveImage(tempImageUrl, prompt._id);
        console.log(`이미지 로컬 저장 완료: ${localImagePath}`);
        
        // 이미지 안전성 평가 (임시 URL 또는 로컬 경로 사용 가능 여부 확인 필요)
        // evaluateImageSafety 구현에 따라 인자 변경 필요할 수 있음
        // 여기서는 임시 URL로 평가한다고 가정
        const safetyLevel = await evaluateImageSafety(tempImageUrl);
        
        // 생성된 이미지 저장 (로컬 경로 사용)
        const newImage = new Image({
          path: localImagePath, // 로컬 경로 저장
          isExternalUrl: false,  // 로컬 저장 플래그
          prompt: prompt._id,
          student: prompt.student._id, // populate된 student 객체에서 _id 사용
          status: 'pending',
          safetyLevel
        });
        
        await newImage.save();
        
        // 프롬프트 상태 업데이트
        prompt.generatedImage = newImage._id;
        await prompt.save();
        
        // 소켓을 통해 교사에게 새 이미지 알림 (로컬 경로 전달)
        if (req.io) {
          const student = await User.findById(prompt.student._id); // 학생 정보 다시 로드
          req.io.emit('imageGenerated', {
            _id: newImage._id,
            path: localImagePath, // 로컬 경로 전달
            isExternalUrl: false,
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
        console.error('이미지 생성/저장 오류:', error);
        
        // 이미지 생성에 실패한 경우에도 프롬프트 상태를 업데이트
        try {
          // 프롬프트 상태를 'processed'로 변경
          prompt.status = 'processed';
          await prompt.save();
          
          // 소켓을 통해 학생에게 오류 알림
          if (req.io && prompt.student?._id) { // prompt.student가 있는지 확인
            // 특정 학생에게만 이벤트 전송
            req.io.to(prompt.student._id.toString()).emit('promptProcessed', {
              promptId: prompt._id,
              studentId: prompt.student._id,
              status: 'processed',
              message: '이미지 생성 중 오류가 발생했습니다'
            });
            
            console.log(`프롬프트 처리 완료(실패) 이벤트를 학생(${prompt.student._id})에게만 전송했습니다`);
          }
          
          console.log(`프롬프트 ID: ${prompt._id}의 상태를 'processed'로 변경했습니다. (이미지 생성 실패)`);
        } catch (updateError) {
          console.error('프롬프트 상태 업데이트 오류:', updateError);
        }
        
        // 실패 시에도 200 OK와 메시지 반환 (혹은 다른 상태 코드?)
        // 클라이언트에서 이 메시지를 보고 적절히 처리해야 함
        return res.json({
           success: false, // 성공 아님을 명시
           message: `프롬프트는 승인되었으나 이미지 생성 중 오류 발생: ${error.message}`,
           promptStatus: 'processed' // 프롬프트 상태는 변경됨
        });
      }
    } else if (status === 'rejected') {
      // 거부된 경우 소켓을 통해 학생에게 알림
      if (req.io && prompt.student?._id) { // prompt.student가 있는지 확인
        // 특정 학생에게만 이벤트 전송
        req.io.to(prompt.student._id.toString()).emit('promptRejected', {
          promptId: prompt._id,
          studentId: prompt.student._id,
          rejectionReason: prompt.rejectionReason
        });
        
        console.log(`프롬프트 거부 이벤트를 학생(${prompt.student._id})에게만 전송했습니다`);
      }
    }
    
    res.json({
      success: true,
      message: status === 'approved' ? '프롬프트가 승인되고 이미지 생성이 시작되었습니다.' : '프롬프트가 거부되었습니다'
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
    
    const image = await Image.findById(imageId).populate('student', '_id'); // student _id 포함
    
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
    if (req.io && image.student?._id) { // image.student가 있는지 확인
      if (status === 'approved') {
        // 외부 URL인 경우 그대로 전달, 아닌 경우 /uploads/ 경로 추가
        const imageUrl = image.isExternalUrl
          ? image.path
          : image.path; // 이미 /uploads/ 경로 포함됨
        
        // 특정 학생에게만 이벤트 전송 (room 기능 사용)
        req.io.to(image.student._id.toString()).emit('imageApproved', {
          imageId: image._id,
          studentId: image.student._id,
          imageUrl: imageUrl,
          promptId: image.prompt // 프롬프트 ID도 함께 전송
        });
        
        console.log(`이미지 승인 이벤트를 학생(${image.student._id})에게만 전송했습니다`);
      } else if (status === 'rejected') {
        // 특정 학생에게만 이벤트 전송
        req.io.to(image.student._id.toString()).emit('imageRejected', {
          imageId: image._id,
          studentId: image.student._id,
          rejectionReason: image.rejectionReason
        });
        
        console.log(`이미지 거부 이벤트를 학생(${image.student._id})에게만 전송했습니다`);
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
    
    // 비밀번호 해싱
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);
    
    // 비밀번호 업데이트 (해시된 값으로)
    student.password = hashedPassword;
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
    const { promptIds: requestedPromptIds } = req.body; // 요청된 ID 목록

    // 교사 ID 가져오기
    const teacherId = req.user._id;

    // 해당 교사에게 배정된 학생 ID 목록 조회 (기존 로직과 동일)
    let studentIds = [];
    if (req.user.metadata && req.user.metadata.studentIds && req.user.metadata.studentIds.length > 0) {
      studentIds = req.user.metadata.studentIds;
    } else {
      const students = await User.find({ role: 'student', 'metadata.teacherId': teacherId });
      studentIds = students.map(student => student._id);
    }

    // 처리할 프롬프트 목록 조회
    const query = { status: 'pending' };
    if (req.user.role !== 'admin' && studentIds.length > 0) {
      query.student = { $in: studentIds };
    }
    // 요청된 ID가 있으면 해당 ID들만 조회
    if (requestedPromptIds && Array.isArray(requestedPromptIds) && requestedPromptIds.length > 0) {
      query._id = { $in: requestedPromptIds };
    } else {
      // 요청된 ID가 없으면 처리할 프롬프트가 없는 것
       return res.status(400).json({
        success: false,
        message: '처리할 프롬프트 ID 목록이 필요합니다'
      });
    }

    const pendingPrompts = await Prompt.find(query)
      .populate('student', '_id name username') // student 정보 포함
      .sort({ createdAt: 1 });

    if (pendingPrompts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '처리할 유효한 프롬프트가 없습니다 (이미 처리되었거나 권한 없음)'
      });
    }

    console.log(`일괄 처리할 프롬프트 수: ${pendingPrompts.length}`);

    // 교사 크레딧 확인
    const currentTeacher = await User.findById(teacherId); // 최신 크레딧 정보 로드
    if (currentTeacher.credits < pendingPrompts.length) {
      return res.status(400).json({
        success: false,
        message: `크레딧이 부족합니다. 필요: ${pendingPrompts.length}, 보유: ${currentTeacher.credits}`,
        credits: currentTeacher.credits,
        neededCredits: pendingPrompts.length
      });
    }

    console.log(`[일괄 처리] 초기 상태 업데이트 시작. 대상 프롬프트 수: ${pendingPrompts.length}`); // 로그 추가

    // 먼저 모든 프롬프트 상태를 'processing'으로 변경 시도 (오류 처리 강화)
    let updateErrors = [];
    const promptsToProcess = []; // 실제로 처리할 프롬프트 목록
    for (const prompt of pendingPrompts) {
      try {
        prompt.status = 'processing'; // 일시적인 처리 중 상태
        await prompt.save();
        promptsToProcess.push(prompt); // 성공한 프롬프트만 처리 목록에 추가
      } catch (updateError) {
        console.error(`[일괄 처리] 초기 상태 업데이트 오류 (${prompt._id}):`, updateError);
        updateErrors.push({ promptId: prompt._id.toString(), error: updateError.message });
      }
    }

     // 초기 상태 업데이트 실패한 프롬프트가 있으면 알림 (처리 계속)
     if (updateErrors.length > 0) {
        console.warn(`[일괄 처리] ${updateErrors.length}개의 프롬프트 초기 상태 업데이트 실패`);
        // 실패 알림 소켓 이벤트 (선택 사항)
     }

    // 실제로 처리할 프롬프트가 없는 경우 (모두 초기 업데이트 실패)
    if (promptsToProcess.length === 0) {
        console.error('[일괄 처리] 모든 프롬프트 초기 상태 업데이트 실패. 처리 중단.', updateErrors);
        // 500 대신 409 Conflict 또는 다른 적절한 상태 코드 사용 고려
        return res.status(500).json({
            success: false,
            message: '모든 프롬프트의 초기 상태 업데이트에 실패하여 처리를 시작할 수 없습니다.',
            errors: updateErrors // 실제 오류 내용을 포함하여 반환
        });
    }


    // 비동기 처리 시작 응답 (실제로 처리될 프롬프트 수 기준)
    res.status(202).json({
      success: true,
      message: `${promptsToProcess.length}개의 프롬프트 일괄 처리가 시작되었습니다`,
      batchId: Date.now().toString(),
      totalPromptsToProcess: promptsToProcess.length,
      initialUpdateErrors: updateErrors // 초기 업데이트 오류 정보 전달
    });

    // 각 프롬프트에 대한 비동기 처리 (promptsToProcess 사용)
    (async () => {
      let successCount = 0;
      let errorCount = 0;
      const processedDetails = []; // 각 프롬프트 처리 결과 저장

      // 크레딧 차감 (실제 처리될 개수만큼)
      try {
          const teacherForCredit = await User.findById(teacherId);
          teacherForCredit.credits -= promptsToProcess.length;
          // 크레딧 사용 내역 추가
          teacherForCredit.creditHistory.push({
              amount: -promptsToProcess.length,
              reason: `${promptsToProcess.length}개 프롬프트 일괄 처리`,
              timestamp: new Date()
          });
          await teacherForCredit.save();
          console.log(`[일괄 처리] 크레딧 ${promptsToProcess.length} 차감 완료. 현재 잔액: ${teacherForCredit.credits}`);
      } catch (creditError) {
          console.error('[일괄 처리] 크레딧 차감 오류:', creditError);
          // 크레딧 차감 실패 시 처리를 중단할지 결정 필요
          // 여기서는 일단 계속 진행
      }


      // 각 프롬프트 순차 처리
      for (const prompt of promptsToProcess) {
          let status = 'failed'; // 최종 상태
          let errorMessage = null;
          let generatedImageId = null;

          try {
              // 프롬프트 상태가 여전히 processing인지 확인
              const currentPrompt = await Prompt.findById(prompt._id);
              if (!currentPrompt || currentPrompt.status !== 'processing') {
                  console.log(`[일괄 처리] 프롬프트(${prompt._id})가 이미 다른 상태(${currentPrompt?.status})입니다. 건너니다.`);
                  errorCount++;
                  errorMessage = '이미 다른 상태로 변경됨';
                  processedDetails.push({ promptId: prompt._id.toString(), status, error: errorMessage });
                  continue; // 다음 프롬프트로
              }

              // 프롬프트 상태 업데이트 (승인)
              currentPrompt.status = 'approved';
              currentPrompt.reviewedBy = req.user._id;
              currentPrompt.reviewedAt = Date.now();
              await currentPrompt.save();

              // 소켓 승인 알림 (기존 로직과 동일)
              if (req.io && currentPrompt.student?._id) {
                 req.io.to(currentPrompt.student._id.toString()).emit('promptApproved', {
                   promptId: currentPrompt._id,
                   studentId: currentPrompt.student._id
                 });
                 console.log(`[일괄 처리] 프롬프트 승인 이벤트 전송: ${currentPrompt._id}`);
              }

              // 이미지 생성
              try {
                  const tempImageUrl = await generateImage(currentPrompt.content, true); // true = 일괄 처리 작업

                  // 이미지 다운로드 및 로컬 저장
                  const localImagePath = await downloadAndSaveImage(tempImageUrl, currentPrompt._id);
                  console.log(`[일괄 처리] 이미지 로컬 저장 완료: ${localImagePath} (프롬프트: ${currentPrompt._id})`);

                  const safetyLevel = await evaluateImageSafety(tempImageUrl); // 임시 URL로 평가 가정

                  // 이미지 정보 저장
                  const newImage = new Image({
                      path: localImagePath,
                      isExternalUrl: false,
                      prompt: currentPrompt._id,
                      student: currentPrompt.student._id,
                      status: 'pending', // 이미지는 승인 대기 상태로 생성
                      safetyLevel
                  });
                  await newImage.save();
                  generatedImageId = newImage._id.toString();

                  // 프롬프트와 이미지 연결 및 상태 변경 ('processed')
                  currentPrompt.generatedImage = newImage._id;
                  currentPrompt.status = 'processed'; // 이미지 생성 성공 시 processed
                  await currentPrompt.save();

                  console.log(`[일괄 처리] 이미지 생성 완료: ${newImage._id} (프롬프트: ${currentPrompt._id}), 상태: processed`);

                  // 새 이미지 생성 소켓 이벤트 (기존 로직과 동일)
                  if (req.io) {
                      const student = await User.findById(currentPrompt.student._id);
                      if (student) {
                         req.io.emit('imageGenerated', {
                             _id: newImage._id,
                             path: localImagePath,
                             isExternalUrl: false,
                             prompt: { _id: currentPrompt._id, content: currentPrompt.content },
                             student: { _id: student._id, name: student.name, username: student.username },
                             safetyLevel: newImage.safetyLevel,
                             createdAt: newImage.createdAt
                         });
                         console.log(`[일괄 처리] 새 이미지 생성 이벤트 전송: ${newImage._id}`);
                      }
                  }

                  status = 'success';
                  successCount++;
              } catch (imageError) {
                  console.error(`[일괄 처리] 이미지 생성/저장 실패 (프롬프트: ${prompt._id}):`, imageError);
                  errorMessage = imageError.message || '이미지 생성/저장 실패';
                  errorCount++;

                  // 이미지 생성 실패 시 프롬프트 상태를 'processed'로 변경 시도
                  try {
                      currentPrompt.status = 'processed'; // 이미지 생성 실패해도 processed
                      await currentPrompt.save();
                      console.log(`[일괄 처리] 이미지 생성 실패로 프롬프트(${prompt._id}) 상태를 'processed'로 변경`);
                      if (req.io && currentPrompt.student?._id) {
                          req.io.to(currentPrompt.student._id.toString()).emit('promptProcessed', {
                              promptId: currentPrompt._id,
                              studentId: currentPrompt.student._id,
                              status: 'processed',
                              message: '이미지 생성 중 오류가 발생했습니다'
                          });
                      }
                  } catch (statusUpdateError) {
                      console.error(`[일괄 처리] 실패 후 프롬프트(${prompt._id}) 상태 업데이트 오류:`, statusUpdateError);
                      errorMessage += ` (상태 업데이트 실패: ${statusUpdateError.message})`;
                  }
              } // 이미지 생성 try-catch 끝

          } catch (promptError) {
              console.error(`[일괄 처리] 프롬프트 처리 오류 (${prompt._id}):`, promptError);
              errorMessage = promptError.message || '프롬프트 처리 오류';
              errorCount++;
              // 프롬프트 처리 자체 오류 시 상태 복구 시도 (선택 사항)
              try {
                  const recoveryPrompt = await Prompt.findById(prompt._id);
                  if (recoveryPrompt && recoveryPrompt.status === 'processing') {
                      recoveryPrompt.status = 'pending'; // 다시 pending으로
                      await recoveryPrompt.save();
                  }
              } catch (recoveryError) { /* 무시 */ }
          } // 프롬프트 처리 try-catch 끝

          processedDetails.push({ promptId: prompt._id.toString(), status, imageId: generatedImageId, error: errorMessage });

      } // for 루프 끝

      console.log(`[일괄 처리] 비동기 작업 완료: 총 ${promptsToProcess.length}개 처리 시도, 성공 ${successCount}개, 실패 ${errorCount}개`);

      // 완료 이벤트 전송
      if (req.io) {
        req.io.emit('batchProcessingCompleted', {
          teacherId: req.user._id,
          totalProcessed: promptsToProcess.length,
          successCount,
          errorCount,
          details: processedDetails // 상세 결과 포함
        });
        console.log(`[일괄 처리] 일괄 처리 완료 이벤트 전송: 총 ${promptsToProcess.length}개 처리 시도, 성공 ${successCount}개, 실패 ${errorCount}개`);
      }

    })();

  } catch (error) {
    console.error('일괄 프롬프트 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '일괄 프롬프트 처리 중 오류가 발생했습니다'
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