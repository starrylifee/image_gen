/**
 * URL 유효성 검사 유틸리티
 * 만료된 외부 URL을 확인하고 처리하는 함수들 제공
 */
const axios = require('axios');
const Image = require('../models/Image');

/**
 * 외부 URL의 유효성을 검사합니다
 * @param {string} url 검사할 URL 
 * @returns {Promise<boolean>} URL이 유효한지 여부
 */
const isUrlValid = async (url) => {
  try {
    // URL이 없거나 HTTP로 시작하지 않으면 유효하지 않음
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return false;
    }

    // URL에 대한 HEAD 요청 수행 (콘텐츠 다운로드 없이 상태 확인)
    const response = await axios.head(url, { 
      timeout: 5000, // 5초 타임아웃
      validateStatus: (status) => status < 500 // 500 미만의 상태 코드는 성공으로 간주
    });
    
    // 200~399 범위의 상태 코드를 성공으로 간주
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    console.error(`URL 유효성 검사 실패 (${url}):`, error.message);
    return false;
  }
};

/**
 * 이미지 배열에서 만료된 URL을 가진 이미지를 필터링합니다
 * @param {Array} images 이미지 객체 배열
 * @returns {Promise<Array>} 유효한 URL을 가진 이미지 배열
 */
const filterValidImages = async (images) => {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  const validImages = [];
  const invalidImageIds = [];

  // 각 이미지 URL 유효성 검사
  for (const image of images) {
    if (image.isExternalUrl && image.path) {
      const isValid = await isUrlValid(image.path);
      
      if (isValid) {
        validImages.push(image);
      } else {
        console.log(`만료된 이미지 URL 발견: ${image._id}, ${image.path.substring(0, 50)}...`);
        invalidImageIds.push(image._id);
      }
    } else {
      // 내부 이미지는 항상 유효한 것으로 간주
      validImages.push(image);
    }
  }

  // 만료된 이미지 ID가 있으면 DB에서 삭제
  if (invalidImageIds.length > 0) {
    try {
      // 만료된 이미지 DB에서 삭제
      const deleteResult = await Image.deleteMany({ _id: { $in: invalidImageIds } });
      console.log(`만료된 이미지 ${deleteResult.deletedCount}개 DB에서 삭제 완료`);
    } catch (error) {
      console.error('만료된 이미지 삭제 오류:', error);
    }
  }

  return validImages;
};

/**
 * 특정 학생의 모든 만료된 이미지 URL을 데이터베이스에서 정리합니다
 * @param {string} studentId 학생 ID
 * @returns {Promise<number>} 삭제된 이미지 수
 */
const cleanupExpiredImagesForStudent = async (studentId) => {
  try {
    // 해당 학생의 외부 URL 이미지 조회
    const images = await Image.find({
      student: studentId,
      isExternalUrl: true
    });

    if (!images || images.length === 0) {
      return 0;
    }

    // 만료된 이미지 URL 필터링
    const expiredImageIds = [];
    
    for (const image of images) {
      const isValid = await isUrlValid(image.path);
      if (!isValid) {
        expiredImageIds.push(image._id);
      }
    }

    // 만료된 이미지가 없으면 종료
    if (expiredImageIds.length === 0) {
      return 0;
    }

    // DB에서 만료된 이미지 삭제
    const deleteResult = await Image.deleteMany({ _id: { $in: expiredImageIds } });
    return deleteResult.deletedCount;
  } catch (error) {
    console.error('학생 만료 이미지 정리 오류:', error);
    return 0;
  }
};

module.exports = {
  isUrlValid,
  filterValidImages,
  cleanupExpiredImagesForStudent
};
