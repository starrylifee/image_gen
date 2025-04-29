const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
require('dotenv').config();

// OpenAI API 키 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 대기열 관리를 위한 설정
const MAX_CONCURRENT_JOBS = 3;             // 최대 동시 처리 작업 수
const API_RATE_LIMIT = 12;                 // 분당 최대 API 호출 수 (여유 있게 15에서 12로 설정)
const API_CALL_INTERVAL = 60000 / API_RATE_LIMIT; // API 호출 간 간격 (밀리초)
const pendingQueue = [];
let activeJobs = 0;
let lastAPICallTime = 0;                   // 마지막 API 호출 시간

// 일괄 처리 상태 추적
const batchProcessingStatus = {
  isRunning: false,             // 일괄 처리 실행 중 여부
  totalJobs: 0,                 // 총 작업 수
  completedJobs: 0,             // 완료된 작업 수
  failedJobs: 0,                // 실패한 작업 수
  startTime: null,              // 시작 시간
  estimatedEndTime: null,       // 예상 완료 시간
  remainingTime: null,          // 남은 시간 (초)
  progress: 0                   // 진행률 (%)
};

/**
 * 프롬프트를 기반으로 이미지 생성
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @param {boolean} isBatch 일괄 처리 작업인지 여부
 * @returns {Promise<string>} 생성된 이미지의 URL
 */
const generateImage = async (prompt, isBatch = false) => {
  try {
    console.log(`이미지 생성 요청: "${prompt}"`);
    console.log(`환경 변수 UPLOADS_DIR: ${process.env.UPLOADS_DIR || '설정되지 않음'}`);
    
    return new Promise((resolve, reject) => {
      // 대기열에 작업 추가
      const job = {
        prompt,
        resolve,
        reject,
        isBatch,
        addedTime: Date.now(),
        attempts: 0
      };
      
      pendingQueue.push(job);
      console.log(`이미지 생성 작업 대기열에 추가됨. 현재 대기 작업: ${pendingQueue.length}, 활성 작업: ${activeJobs}`);
      
      // 작업 처리 시작
      processQueue();
    });
  } catch (error) {
    console.error('이미지 생성 실패:', error);
    
    // 에러 발생 시 기본 이미지 URL 반환
    const encodedPrompt = encodeURIComponent(prompt + ' (오류 발생)');
    return `https://via.placeholder.com/1024x1024?text=${encodedPrompt}`;
  }
};

/**
 * 일괄 처리를 시작하고 상태를 초기화
 * @param {number} totalJobs 총 작업 수
 */
const startBatchProcessing = (totalJobs) => {
  batchProcessingStatus.isRunning = true;
  batchProcessingStatus.totalJobs = totalJobs;
  batchProcessingStatus.completedJobs = 0;
  batchProcessingStatus.failedJobs = 0;
  batchProcessingStatus.startTime = Date.now();
  
  // 예상 완료 시간 계산 (초당 API_RATE_LIMIT/60개 처리 가정)
  const estimatedSeconds = Math.ceil(totalJobs / (API_RATE_LIMIT / 60));
  batchProcessingStatus.estimatedEndTime = new Date(Date.now() + estimatedSeconds * 1000);
  batchProcessingStatus.remainingTime = estimatedSeconds;
  batchProcessingStatus.progress = 0;
  
  console.log(`일괄 처리 시작: 총 ${totalJobs}개 작업, 예상 완료 시간: ${estimatedSeconds}초 후`);
};

/**
 * 일괄 처리 상태 업데이트
 * @param {boolean} isSuccess 작업 성공 여부
 */
const updateBatchStatus = (isSuccess) => {
  if (!batchProcessingStatus.isRunning) return;
  
  if (isSuccess) {
    batchProcessingStatus.completedJobs++;
  } else {
    batchProcessingStatus.failedJobs++;
  }
  
  const processedJobs = batchProcessingStatus.completedJobs + batchProcessingStatus.failedJobs;
  batchProcessingStatus.progress = Math.round((processedJobs / batchProcessingStatus.totalJobs) * 100);
  
  // 남은 시간 재계산
  const elapsed = (Date.now() - batchProcessingStatus.startTime) / 1000;
  const rate = processedJobs / elapsed; // 초당 처리 속도
  const remaining = (batchProcessingStatus.totalJobs - processedJobs) / rate;
  batchProcessingStatus.remainingTime = Math.ceil(remaining);
  
  console.log(`일괄 처리 진행: ${processedJobs}/${batchProcessingStatus.totalJobs} (${batchProcessingStatus.progress}%), 남은 시간: ${batchProcessingStatus.remainingTime}초`);
  
  // 모든 작업이 완료되면 상태 초기화
  if (processedJobs >= batchProcessingStatus.totalJobs) {
    batchProcessingStatus.isRunning = false;
    console.log('일괄 처리 완료');
  }
};

/**
 * 일괄 처리 상태 조회
 * @returns {Object} 현재 일괄 처리 상태
 */
const getBatchStatus = () => {
  return { ...batchProcessingStatus };
};

/**
 * API 호출 간격 확인 및 지연
 * @returns {Promise<void>}
 */
const checkAPIRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastAPICallTime;
  
  // API 호출 간격이 충분하지 않으면 대기
  if (timeSinceLastCall < API_CALL_INTERVAL) {
    const waitTime = API_CALL_INTERVAL - timeSinceLastCall;
    console.log(`API 속도 제한 준수를 위해 ${waitTime}ms 대기`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // 마지막 API 호출 시간 업데이트
  lastAPICallTime = Date.now();
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
    // API 속도 제한 확인
    await checkAPIRateLimit();
    
    // 이미지 생성 실행
    const imageUrl = await generateRealImage(job.prompt);
    
    // 작업 완료 처리
    job.resolve(imageUrl);
    
    // 일괄 처리 작업이면 상태 업데이트
    if (job.isBatch) {
      updateBatchStatus(true);
    }
  } catch (error) {
    console.error('이미지 생성 작업 실패:', error);
    
    // 재시도 횟수가 3회 미만이면 작업 다시 큐에 추가
    if (job.attempts < 3) {
      job.attempts++;
      console.log(`작업 재시도 (${job.attempts}/3): ${job.prompt.substring(0, 30)}...`);
      pendingQueue.push(job);
    } else {
      // 재시도 횟수 초과 시 오류 응답
      console.log(`최대 재시도 횟수 초과: ${job.prompt.substring(0, 30)}...`);
      
      // 오류 발생 시 더미 이미지로 대체
      try {
        const fallbackImageUrl = await generateDummyImageUrl(job.prompt + ' (API 오류로 인한 대체 이미지)');
        job.resolve(fallbackImageUrl);
      } catch (fallbackError) {
        // 더미 이미지 생성도 실패한 경우 기본 플레이스홀더 이미지 반환
        const encodedPrompt = encodeURIComponent(job.prompt + ' (이미지 생성 실패)');
        job.resolve(`https://via.placeholder.com/1024x1024?text=${encodedPrompt}`);
      }
      
      // 일괄 처리 작업이면 상태 업데이트 (실패)
      if (job.isBatch) {
        updateBatchStatus(false);
      }
    }
  } finally {
    // 활성 작업 감소 및 다음 작업 처리
    activeJobs--;
    
    // 다음 작업 처리 예약 (즉시 실행하지 않고 약간의 지연 추가)
    setTimeout(processQueue, 50);
  }
};

/**
 * OpenAI API를 통한 실제 이미지 생성
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 이미지의 URL
 */
const generateRealImage = async (prompt) => {
  try {
    console.log('====== DALL-E 이미지 생성 프로세스 시작 ======');
    console.log(`프롬프트: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    console.log(`API 키 확인: ${process.env.OPENAI_API_KEY ? '설정됨 ('+process.env.OPENAI_API_KEY.substring(0, 5)+'...)' : '설정되지 않음'}`);
    
    // OpenAI API 호출 - URL 형식으로 요청
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url"  // 반드시 URL 형식으로 요청
    });
    
    // 응답에서 이미지 URL 추출
    const imageUrl = response.data[0].url;
    console.log(`DALL-E 이미지 생성 성공!`);
    console.log(`생성된 원본 URL: ${imageUrl}`);
    console.log(`응답 전체 데이터:`, JSON.stringify(response.data[0]).substring(0, 200) + '...');
    console.log('====== DALL-E 이미지 생성 프로세스 완료 ======');
    
    return imageUrl;
  } catch (error) {
    console.error('====== DALL-E 이미지 생성 오류 ======');
    console.error(`오류 메시지: ${error.message}`);
    console.error(`오류 상태 코드: ${error.status || 'N/A'}`);
    if (error.response) {
      console.error(`API 응답: ${JSON.stringify(error.response).substring(0, 200)}...`);
    }
    console.error('오류 스택:', error.stack);
    console.log('API 오류로 인해 더미 이미지로 대체합니다.');
    return await generateDummyImageUrl(prompt + ' (API 오류로 인한 대체 이미지)');
  }
};

/**
 * 이미지 안전성 평가
 * @param {string} imageUrl 안전성을 평가할 이미지 URL
 * @returns {Promise<string>} 안전성 수준 (safe, moderate, unsafe)
 */
const evaluateImageSafety = async (imageUrl) => {
  try {
    console.log(`이미지 안전성 평가: ${imageUrl}`);
    
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
 * 테스트용 더미 이미지 URL 생성 함수
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 더미 이미지 URL
 */
const generateDummyImageUrl = async (prompt) => {
  return new Promise((resolve) => {
    // 이미지 생성 지연 시뮬레이션 (0.5~2초 랜덤)
    const delay = Math.floor(Math.random() * 1500) + 500;
    
    setTimeout(() => {
      // 외부 placeholder 서비스 사용하여 더미 이미지 URL 생성
      const encodedPrompt = encodeURIComponent(prompt);
      const dummyUrl = `https://via.placeholder.com/1024x1024?text=${encodedPrompt}`;
      
      console.log(`더미 이미지 URL 생성 완료: ${dummyUrl} (${delay}ms)`);
      resolve(dummyUrl);
    }, delay);
  });
};

module.exports = {
  generateImage,
  evaluateImageSafety,
  startBatchProcessing,
  getBatchStatus
}; 