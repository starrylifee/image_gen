const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Prompt = require('../models/Prompt');
const Image = require('../models/Image');

// 관리자 인증 미들웨어
const authenticateAdmin = async (req, res, next) => {
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
    
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('관리자 인증 오류:', error);
    
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

// 모든 사용자 목록 조회
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ success: true, users });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 목록을 가져오는 중 오류가 발생했습니다' });
  }
});

// 사용자 역할 변경
router.patch('/users/:userId/role', authenticateAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 역할입니다' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('역할 변경 오류:', error);
    res.status(500).json({ success: false, message: '역할을 변경하는 중 오류가 발생했습니다' });
  }
});

// 사용자 삭제
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }
    res.json({ success: true, message: '사용자가 삭제되었습니다' });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ success: false, message: '사용자를 삭제하는 중 오류가 발생했습니다' });
  }
});

// 교사 목록 조회 (크레딧 정보 포함)
router.get('/teachers', authenticateAdmin, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('_id username name credits metadata.classroom createdAt lastLogin')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      teachers
    });
  } catch (error) {
    console.error('교사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '교사 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 특정 교사의 크레딧 내역 조회
router.get('/teachers/:teacherId/credits', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // 교사 정보 조회
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' })
      .select('_id username name credits creditHistory');
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사를 찾을 수 없습니다'
      });
    }
    
    // 크레딧 내역에 관리자 정보 추가
    const creditHistory = await Promise.all(
      teacher.creditHistory.map(async (record) => {
        let adminName = '알 수 없음';
        
        if (record.adminId) {
          const admin = await User.findById(record.adminId);
          if (admin) {
            adminName = admin.name;
          }
        }
        
        return {
          ...record.toObject(),
          adminName
        };
      })
    );
    
    res.json({
      success: true,
      teacher: {
        _id: teacher._id,
        username: teacher.username,
        name: teacher.name,
        credits: teacher.credits
      },
      creditHistory: creditHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    console.error('교사 크레딧 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '크레딧 내역 조회 중 오류가 발생했습니다'
    });
  }
});

// 교사에게 크레딧 충전
router.post('/teachers/:teacherId/credits', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { amount, reason } = req.body;
    
    // 입력값 검증
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 크레딧 충전량을 입력해주세요'
      });
    }
    
    // 교사 정보 조회
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사를 찾을 수 없습니다'
      });
    }
    
    // 크레딧 충전 및 내역 기록
    teacher.credits += amount;
    teacher.creditHistory.push({
      amount,
      reason: reason || '관리자에 의한 충전',
      timestamp: new Date(),
      adminId: req.user._id
    });
    
    await teacher.save();
    
    console.log(`교사 ${teacher.name}(${teacher.username})에게 ${amount}크레딧이 충전되었습니다. 현재 잔액: ${teacher.credits}`);
    
    res.json({
      success: true,
      message: `${amount}크레딧이 충전되었습니다`,
      currentCredits: teacher.credits
    });
  } catch (error) {
    console.error('크레딧 충전 오류:', error);
    res.status(500).json({
      success: false,
      message: '크레딧 충전 중 오류가 발생했습니다'
    });
  }
});

// 교사의 크레딧 차감 (테스트용)
router.post('/teachers/:teacherId/deduct-credits', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { amount, reason } = req.body;
    
    // 입력값 검증
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 차감량을 입력해주세요'
      });
    }
    
    // 교사 정보 조회
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사를 찾을 수 없습니다'
      });
    }
    
    // 크레딧 부족 확인
    if (teacher.credits < amount) {
      return res.status(400).json({
        success: false,
        message: '크레딧이 부족합니다',
        currentCredits: teacher.credits,
        requiredCredits: amount
      });
    }
    
    // 크레딧 차감 및 내역 기록
    teacher.credits -= amount;
    teacher.creditHistory.push({
      amount: -amount,
      reason: reason || '관리자에 의한 차감',
      timestamp: new Date(),
      adminId: req.user._id
    });
    
    await teacher.save();
    
    console.log(`교사 ${teacher.name}(${teacher.username})의 크레딧이 ${amount} 차감되었습니다. 현재 잔액: ${teacher.credits}`);
    
    res.json({
      success: true,
      message: `${amount}크레딧이 차감되었습니다`,
      currentCredits: teacher.credits
    });
  } catch (error) {
    console.error('크레딧 차감 오류:', error);
    res.status(500).json({
      success: false,
      message: '크레딧 차감 중 오류가 발생했습니다'
    });
  }
});

// 크레딧 가격 정책 조회
router.get('/credit-pricing', authenticateAdmin, (req, res) => {
  const pricingPlans = [
    { id: 'basic', name: '기본 패키지', credits: 50, price: 10000 },
    { id: 'standard', name: '표준 패키지', credits: 120, price: 20000 },
    { id: 'premium', name: '프리미엄 패키지', credits: 300, price: 40000 },
    { id: 'school', name: '학교 패키지', credits: 1000, price: 100000 }
  ];
  
  res.json({
    success: true,
    pricingPlans
  });
});

// 시스템 사용 통계 조회
router.get('/statistics', authenticateAdmin, async (req, res) => {
  try {
    // 사용자 통계
    const userStats = {
      totalTeachers: await User.countDocuments({ role: 'teacher' }),
      totalStudents: await User.countDocuments({ role: 'student' }),
      activeTeachersLastMonth: await User.countDocuments({
        role: 'teacher',
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    };
    
    // 콘텐츠 통계
    const contentStats = {
      totalPrompts: await Prompt.countDocuments(),
      pendingPrompts: await Prompt.countDocuments({ status: 'pending' }),
      approvedPrompts: await Prompt.countDocuments({ status: 'approved' }),
      rejectedPrompts: await Prompt.countDocuments({ status: 'rejected' }),
      processedPrompts: await Prompt.countDocuments({ status: 'processed' }),
      totalImages: await Image.countDocuments(),
      pendingImages: await Image.countDocuments({ status: 'pending' }),
      approvedImages: await Image.countDocuments({ status: 'approved' }),
      rejectedImages: await Image.countDocuments({ status: 'rejected' })
    };
    
    // 크레딧 통계
    const creditStats = {
      totalCreditsIssued: await User.aggregate([
        { $match: { role: 'teacher' } },
        { $group: { _id: null, total: { $sum: '$credits' } } }
      ]).then(result => (result[0]?.total || 0)),
      totalCreditTransactions: await User.aggregate([
        { $match: { role: 'teacher' } },
        { $project: { creditHistoryCount: { $size: '$creditHistory' } } },
        { $group: { _id: null, total: { $sum: '$creditHistoryCount' } } }
      ]).then(result => (result[0]?.total || 0))
    };
    
    res.json({
      success: true,
      statistics: {
        users: userStats,
        content: contentStats,
        credits: creditStats
      }
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다'
    });
  }
});

// 교사 계정 생성 API 추가
router.post('/create-teacher', authenticateAdmin, async (req, res) => {
  try {
    const { username, password, name, classroom, credits } = req.body;
    
    // 필수 입력값 검증
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '아이디, 비밀번호, 이름은 필수 입력 항목입니다'
      });
    }
    
    // 아이디 중복 확인
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 아이디입니다'
      });
    }
    
    // 새 교사 계정 생성
    const newTeacher = new User({
      username,
      password, // 모델에서 저장 전에 해싱됨
      name,
      role: 'teacher',
      credits: credits || 0,
      metadata: {
        classroom: classroom || ''
      }
    });
    
    await newTeacher.save();
    
    console.log(`새 교사 계정이 생성되었습니다: ${name}(${username})`);
    
    res.status(201).json({
      success: true,
      message: '교사 계정이 생성되었습니다',
      teacher: {
        _id: newTeacher._id,
        username: newTeacher.username,
        name: newTeacher.name,
        role: newTeacher.role,
        credits: newTeacher.credits,
        metadata: newTeacher.metadata
      }
    });
  } catch (error) {
    console.error('교사 계정 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '교사 계정 생성 중 오류가 발생했습니다'
    });
  }
});

// 교사에 종속된 학생 계정 생성 API 추가
router.post('/teachers/:teacherId/create-students', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { students, defaultPassword } = req.body;
    
    // 입력값 검증
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 학생 정보가 필요합니다'
      });
    }
    
    // 교사 확인
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사를 찾을 수 없습니다'
      });
    }
    
    // 학생 계정 생성
    const createdStudents = [];
    const failedStudents = [];
    
    for (const student of students) {
      try {
        // 필수 정보 확인
        if (!student.username || !student.name) {
          failedStudents.push({
            ...student,
            reason: '아이디와 이름은 필수 입력 항목입니다'
          });
          continue;
        }
        
        // 아이디 중복 확인
        const existingUser = await User.findOne({ username: student.username });
        if (existingUser) {
          failedStudents.push({
            ...student,
            reason: '이미 사용 중인 아이디입니다'
          });
          continue;
        }
        
        // 학생 계정 생성
        const newStudent = new User({
          username: student.username,
          password: student.password || defaultPassword || 'student123',
          name: student.name,
          role: 'student',
          teacher: teacherId,
          metadata: {
            classroom: teacher.metadata?.classroom || ''
          }
        });
        
        await newStudent.save();
        createdStudents.push({
          _id: newStudent._id,
          username: newStudent.username,
          name: newStudent.name
        });
      } catch (err) {
        console.error(`학생 계정 생성 실패 (${student.username}):`, err);
        failedStudents.push({
          ...student,
          reason: '계정 생성 중 오류가 발생했습니다'
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${createdStudents.length}명의 학생 계정이 생성되었습니다`,
      createdCount: createdStudents.length,
      failedCount: failedStudents.length,
      createdStudents,
      failedStudents
    });
  } catch (error) {
    console.error('학생 계정 일괄 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '학생 계정 생성 중 오류가 발생했습니다'
    });
  }
});

// 특정 교사의 학생 목록 조회
router.get('/teachers/:teacherId/students', authenticateAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // 교사 확인
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '교사를 찾을 수 없습니다'
      });
    }
    
    // 해당 교사와 연결된 학생 목록 조회
    const students = await User.find(
      { 
        role: 'student',
        $or: [
          { 'metadata.teacherId': teacherId }, 
          { teacher: teacherId }
        ]
      }
    ).select('_id username name metadata.classroom createdAt lastLogin');
    
    res.json({
      success: true,
      message: `${students.length}명의 학생이 조회되었습니다`,
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

// 사용자 비밀번호 변경
router.patch('/users/:userId/password', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    // 입력값 검증
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호를 입력해주세요'
      });
    }
    
    // 사용자 찾기
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }
    
    // 비밀번호 변경
    user.password = newPassword;
    await user.save();
    
    console.log(`사용자 ${user.name}(${user.username})의 비밀번호가 변경되었습니다`);
    
    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다',
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다'
    });
  }
});

module.exports = router; 