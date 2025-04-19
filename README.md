# 교사 승인 이미지 생성 시스템

학교 환경에서 안전한 이미지 생성을 위한 교사 승인 기반 이미지 생성 시스템입니다.

## 배포 방법

프로젝트를 서버에 배포하는 방법은 다음과 같습니다:

### 사전 준비

1. Node.js와 npm이 설치되어 있어야 합니다.
2. MongoDB가 설치되어 있거나 MongoDB Atlas 계정이 필요합니다.
3. OpenAI API 키가 필요합니다.

### 로컬 배포 절차

1. 프로젝트 클론:
   ```
   git clone <repository-url>
   cd <project-folder>
   ```

2. 백엔드 설정:
   ```
   cd backend
   npm install
   ```

3. 프론트엔드 설정:
   ```
   cd ../frontend
   npm install
   npm run build
   ```

4. 환경 변수 설정:
   `backend/.env` 파일을 생성하고 다음 내용을 입력합니다:
   ```
   # 환경 변수 설정
   NODE_ENV=production
   PORT=5000

   # MongoDB 설정
   MONGODB_URI=<your-mongodb-connection-string>

   # JWT 설정
   JWT_SECRET=<your-jwt-secret>

   # OpenAI API 키
   OPENAI_API_KEY=<your-openai-api-key>

   # 클라이언트 URL
   CLIENT_URL=<your-client-url-or-domain>

   # 기본 교사 크레딧
   DEFAULT_TEACHER_CREDITS=5
   ```

5. 서버 실행:
   ```
   cd ../backend
   npm start
   ```
   
6. 브라우저에서 `http://localhost:5000`으로 접속합니다.

### 클라우드 배포 절차 (예: Heroku)

1. Heroku CLI 설치 및 로그인:
   ```
   heroku login
   ```

2. Heroku 앱 생성:
   ```
   heroku create <app-name>
   ```

3. MongoDB 애드온 추가:
   ```
   heroku addons:create mongodb:sandbox
   ```

4. 환경 변수 설정:
   ```
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=<your-jwt-secret>
   heroku config:set OPENAI_API_KEY=<your-openai-api-key>
   heroku config:set DEFAULT_TEACHER_CREDITS=5
   ```

5. 앱 배포:
   ```
   git push heroku main
   ```

6. 브라우저에서 Heroku 앱 URL로 접속합니다.

## 배포 정보 업데이트

이 프로젝트는 클라우드 서비스에 배포되어 있습니다. 배포 시 환경 변수를 올바르게 설정해야 합니다.

- 배포 날짜: 2025-04-19
- 최종 업데이트: 2025-04-19

## 기능

- 교사가 학생들의 이미지 생성 요청을 승인
- 승인된 요청에 대해 AI 모델로 이미지 생성
- 교사가 생성된 이미지 확인 및 학생에게 전달

## 기술 스택

- 프론트엔드: React, Styled Components
- 백엔드: Node.js, Express
- 데이터베이스: MongoDB
- 이미지 생성: OpenAI API
- 실시간 업데이트: Socket.io

## 기능 개요

- 학생이 프롬프트를 입력하면 교사가 검토하고 승인합니다.
- 승인된 프롬프트로 이미지를 생성합니다.
- 생성된 이미지는 AI 안전성 평가를 통해 테두리 색상으로 표시됩니다 (안전: 녹색, 보통: 노란색, 위험: 빨간색).
- 교사가 이미지를 검토하고 최종 승인하면 학생에게 전달됩니다.

## 프로젝트 구조

```
project-root/
├── frontend/            # 리액트 프론트엔드
│   ├── public/          # 정적 파일
│   └── src/             # 소스 코드
│       ├── components/  # 재사용 가능한 컴포넌트
│       ├── pages/       # 페이지 컴포넌트
│       └── styles/      # CSS 스타일
├── backend/             # Node.js 백엔드
│   ├── controllers/     # 컨트롤러
│   ├── models/          # 데이터베이스 모델
│   ├── routes/          # API 라우트
│   └── services/        # 비즈니스 로직
├── ai_module/           # AI 모듈 (이미지 생성 및 안전성 평가)
└── docs/                # 문서
```

## 설치 및 실행 방법

### 사전 요구 사항

- Node.js 14 이상
- MongoDB
- Python 3.7 이상 (AI 모듈 사용 시)

### 백엔드 설치 및 실행

```bash
cd backend
npm install
npm run dev
```

### 프론트엔드 설치 및 실행

```bash
cd frontend
npm install
npm start
```

### AI 모듈 설치 및 실행 (옵션)

```bash
cd ai_module
pip install -r requirements.txt
python app.py
```

## 환경 변수 설정

`.env` 파일을 다음과 같이 생성하세요:

```
MONGODB_URI=mongodb://localhost:27017/image-generation-approval
JWT_SECRET=your_jwt_secret_key
PORT=5000
CLIENT_URL=http://localhost:3000
```

## 사용 방법

1. 학생 계정으로 로그인하여 프롬프트를 입력합니다.
2. 교사 계정으로 로그인하여 프롬프트를 검토하고 승인합니다.
3. 승인 후 자동으로 이미지가 생성되며, 교사는 안전성 표시(테두리 색상)와 함께 이미지를 검토합니다.
4. 교사가 이미지를 최종 승인하면 학생에게 결과가 표시됩니다.

## 라이센스

This project is licensed under the MIT License - see the LICENSE file for details. 