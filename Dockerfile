FROM node:18-alpine

WORKDIR /app

# 백엔드 의존성 설치
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# 프론트엔드 의존성 설치 및 빌드
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# 소스 코드 복사
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# 프론트엔드 빌드
RUN cd frontend && npm run build

# 백엔드 서버 실행을 위한 환경 설정
WORKDIR /app/backend

# 필요한 디렉토리 생성
RUN mkdir -p uploads

# 환경 변수 설정 - 민감 정보는 자리 표시자 유지
ENV NODE_ENV=production
ENV PORT=8080
ENV MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
ENV JWT_SECRET=ZfmrhX2qG7sP9t3vL8yK5jD4bE6nC1wA0uV2xR5tY7iO9pL3kM1zQ8wB4gF6hN0j
ENV OPENAI_API_KEY=your_openai_api_key_here
ENV CLIENT_URL=/
ENV DEFAULT_TEACHER_CREDITS=5

# 서버 실행
EXPOSE 8080
CMD ["npm", "start"] 