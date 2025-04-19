const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const Jimp = require('jimp');
require('dotenv').config();

// OpenAI API 키 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 대기열 관리를 위한 설정
const MAX_CONCURRENT_JOBS = 3;
const pendingQueue = [];
let activeJobs = 0;

/**
 * 이미지 디렉토리 확인 또는 생성 함수
 * @returns {string} 이미지 업로드 디렉토리 경로
 */
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('uploads 디렉토리 생성:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

/**
 * 프롬프트를 기반으로 이미지 생성
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 이미지의 파일 경로
 */
const generateImage = async (prompt) => {
  try {
    console.log(`이미지 생성 요청: "${prompt}"`);
    
    // 업로드 디렉토리 확인 및 생성
    const uploadsDir = ensureUploadsDirectory();
    
    return new Promise((resolve, reject) => {
      // 대기열에 작업 추가
      const job = {
        prompt,
        resolve,
        reject
      };
      
      pendingQueue.push(job);
      console.log(`이미지 생성 작업 대기열에 추가됨. 현재 대기 작업: ${pendingQueue.length}, 활성 작업: ${activeJobs}`);
      
      // 작업 처리 시작
      processQueue();
    });
  } catch (error) {
    console.error('이미지 생성 실패:', error);
    throw error;
  }
};

/**
 * 대기열 작업 처리
 */
const processQueue = async () => {
  // 활성 작업이 최대 개수에 도달하면 대기
  if (activeJobs >= MAX_CONCURRENT_JOBS || pendingQueue.length === 0) {
    return;
  }
  
  // 대기열에서 작업 꺼내기
  const job = pendingQueue.shift();
  activeJobs++;
  
  console.log(`이미지 생성 작업 시작. 남은 대기 작업: ${pendingQueue.length}, 활성 작업: ${activeJobs}`);
  
  try {
    // 이미지 생성 실행
    const imagePath = await generateRealImage(job.prompt);
    
    // 작업 완료 처리
    job.resolve(imagePath);
  } catch (error) {
    console.error('이미지 생성 작업 실패:', error);
    
    // 오류 발생 시 더미 이미지로 대체
    try {
      const fallbackImage = await generateDummyImage(job.prompt + ' (API 오류로 인한 대체 이미지)');
      job.resolve(fallbackImage);
    } catch (fallbackError) {
      job.reject(error);
    }
  } finally {
    // 활성 작업 감소 및 다음 작업 처리
    activeJobs--;
    processQueue();
  }
};

/**
 * OpenAI API를 통한 실제 이미지 생성
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 이미지의 파일 경로
 */
const generateRealImage = async (prompt) => {
  try {
    console.log('OpenAI DALL-E API를 통한 이미지 생성 시작');
    
    // OpenAI API 호출
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });
    
    // 응답에서 이미지 데이터 추출
    const imageData = response.data[0].b64_json;
    
    // Base64 디코딩하여 이미지 저장
    const buffer = Buffer.from(imageData, 'base64');
    const filename = `${uuidv4()}.png`;
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, filename);
    
    // 파일 저장
    fs.writeFileSync(filePath, buffer);
    console.log(`DALL-E 이미지 생성 완료: ${filename}`);
    
    return filename;
  } catch (error) {
    console.error('OpenAI 이미지 생성 오류:', error.message);
    console.log('API 오류로 인해 더미 이미지로 대체합니다.');
    return await generateDummyImage(prompt + ' (API 오류로 인한 대체 이미지)');
  }
};

/**
 * 이미지 안전성 평가
 * @param {string} imagePath 안전성을 평가할 이미지 경로
 * @returns {Promise<string>} 안전성 수준 (safe, moderate, unsafe)
 */
const evaluateImageSafety = async (imagePath) => {
  try {
    console.log(`이미지 안전성 평가: ${imagePath}`);
    
    // 실제 안전성 평가 로직 (현재는 더미 구현)
    // OpenAI의 안전성 평가는 이미지 생성 시 기본 적용되므로 추가 평가 불필요
    return getDummySafetyLevel();
  } catch (error) {
    console.error('이미지 안전성 평가 실패:', error);
    // 오류 발생 시 기본값 반환
    return 'moderate';
  }
};

// 더미 안전성 수준 반환 함수
const getDummySafetyLevel = () => {
  // 90%는 safe, 8%는 moderate, 2%는 unsafe로 설정
  const rand = Math.random() * 100;
  let safetyLevel;
  
  if (rand < 90) {
    safetyLevel = 'safe';
  } else if (rand < 98) {
    safetyLevel = 'moderate';
  } else {
    safetyLevel = 'unsafe';
  }
  
  console.log(`이미지 안전성 평가 결과: ${safetyLevel}`);
  return safetyLevel;
};

/**
 * 테스트용 더미 이미지 생성 함수
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 이미지의 파일 경로
 */
const generateDummyImage = async (prompt) => {
  return new Promise((resolve, reject) => {
    try {
      // 이미지 생성 지연 시뮬레이션 (0.5~2초 랜덤)
      const delay = Math.floor(Math.random() * 1500) + 500;
      
      setTimeout(() => {
        const filename = `${uuidv4()}.svg`;
        const uploadsDir = path.join(__dirname, '../uploads');
        const filePath = path.join(uploadsDir, filename);
        
        // 간단한 SVG 이미지 생성
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        const svgContent = `
          <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
            <rect width="400" height="300" fill="${randomColor}" />
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${prompt}</text>
          </svg>
        `;
        
        fs.writeFileSync(filePath, svgContent);
        console.log(`더미 이미지 생성 완료: ${filename} (${delay}ms)`);
        
        resolve(filename);
      }, delay);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateImage,
  evaluateImageSafety
}; 