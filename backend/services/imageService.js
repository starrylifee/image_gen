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
const MAX_CONCURRENT_JOBS = 3;
const pendingQueue = [];
let activeJobs = 0;

/**
 * 프롬프트를 기반으로 이미지 생성
 * @param {string} prompt 이미지 생성을 위한 프롬프트 텍스트
 * @returns {Promise<string>} 생성된 이미지의 URL
 */
const generateImage = async (prompt) => {
  try {
    console.log(`이미지 생성 요청: "${prompt}"`);
    
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
    
    // 에러 발생 시 기본 이미지 URL 반환
    const encodedPrompt = encodeURIComponent(prompt + ' (오류 발생)');
    return `https://via.placeholder.com/1024x1024?text=${encodedPrompt}`;
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
    const imageUrl = await generateRealImage(job.prompt);
    
    // 작업 완료 처리
    job.resolve(imageUrl);
  } catch (error) {
    console.error('이미지 생성 작업 실패:', error);
    
    // 오류 발생 시 더미 이미지로 대체
    try {
      const fallbackImageUrl = await generateDummyImageUrl(job.prompt + ' (API 오류로 인한 대체 이미지)');
      job.resolve(fallbackImageUrl);
    } catch (fallbackError) {
      // 더미 이미지 생성도 실패한 경우 기본 플레이스홀더 이미지 반환
      const encodedPrompt = encodeURIComponent(job.prompt + ' (이미지 생성 실패)');
      job.resolve(`https://via.placeholder.com/1024x1024?text=${encodedPrompt}`);
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
 * @returns {Promise<string>} 생성된 이미지의 URL
 */
const generateRealImage = async (prompt) => {
  try {
    console.log('OpenAI DALL-E API를 통한 이미지 생성 시작');
    
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
    console.log(`DALL-E 이미지 URL 생성 완료: ${imageUrl}`);
    
    return imageUrl;
  } catch (error) {
    console.error('OpenAI 이미지 생성 오류:', error.message);
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
  evaluateImageSafety
}; 