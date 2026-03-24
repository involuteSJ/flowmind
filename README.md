# FlowMind

**FlowMind**는 커스텀 객체 탐지(Object Detection) 모델을 누구나 쉽게 만들 수 있도록 돕는 End-to-End MLOps 플랫폼입니다.

데이터셋 관리부터 어노테이션, 모델 학습, 평가, 경량화까지 — 하나의 웹 인터페이스에서 모든 과정을 완결합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 📁 **Dataset Management** | 이미지 업로드, 버전 관리, 확정(Finalize) / 브랜치 |
| 🏷️ **Self-Annotation** | 브라우저에서 직접 바운딩 박스 드로잉 (YOLO 포맷) |
| 🤖 **Model Training** | YOLOv8 / YOLO11 / YOLO12, 하이퍼파라미터 커스텀, 실시간 진행률 |
| ⚡ **Model Optimization** | ONNX / TensorRT Engine 경량화, FP16 · Dynamic Shape 옵션 |
| 📊 **Model Evaluation** | Precision / Recall / mAP@50 / mAP@50:95 자동 계산 |
| 🔐 **Auth** | JWT 기반 회원가입 / 로그인 |

---

## 기술 스택

```
Frontend  : React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
Backend   : Spring Boot 3 (Java 21) + Spring Security + JPA (Hibernate) + MySQL
AI Server : FastAPI (Python 3.11) + ultralytics (YOLOv8/11/12) + PyTorch
```

---

## 프로젝트 구조

```
flowmind/
├── FE/                  # React 프론트엔드
├── BE/                  # Spring Boot 백엔드
├── ai-server/           # FastAPI AI 서버 (학습 / 평가 / 경량화)
└── flowmind.sql         # DB 스키마
```

---

## 시작하기

### 사전 요구사항

- Java 21+
- Node.js 18+
- Python 3.11+
- MySQL 8.0+
- (선택) NVIDIA GPU + CUDA 12.x (TensorRT 경량화, 학습 가속)

---

### 1. 데이터베이스 설정

```sql
CREATE DATABASE flowmind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flowmind;
SOURCE flowmind.sql;
```

---

### 2. Backend 설정

```bash
cd BE/src/main/resources

# example 파일을 복사하여 실제 설정 파일 생성
cp application.properties.example application.properties
```

`application.properties`를 열고 아래 항목을 환경에 맞게 수정하세요:

```properties
# ===== MySQL =====
spring.datasource.url=jdbc:mysql://localhost:3306/flowmind?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
spring.datasource.username=YOUR_DB_USERNAME         # ← 변경
spring.datasource.password=YOUR_DB_PASSWORD         # ← 변경

# ===== JWT =====
jwt.secret=YOUR_JWT_SECRET_KEY_AT_LEAST_32_CHARACTERS_LONG   # ← 변경 (32자 이상)

# ===== 파일 저장 경로 =====
app.dataset.root-path=/your/path/to/datasets        # ← 변경
app.model.output-path=/your/path/to/models          # ← 변경
app.be.base-url=http://localhost:8080               # 배포 시 변경

# ===== AI Server =====
app.ai-server.url=http://localhost:8000             # AI 서버 주소
```

```bash
cd BE
./mvnw spring-boot:run
```

---

### 3. AI Server 설정

```bash
cd ai-server

# example 파일 복사
cp .env.example .env
```

`.env`를 열고 수정:

```env
BE_BASE_URL=http://localhost:8080        # BE 주소
MODEL_OUTPUT_PATH=/your/path/to/models  # ← 변경 (BE와 동일하게)
TEMP_DATASET_PATH=/your/path/to/temp    # ← 변경
```

```bash
# 가상환경 생성 및 의존성 설치
py -3.11 -m venv .venv
.venv/Scripts/pip install -r requirements.txt

# CUDA GPU 사용 시 (선택)
.venv/Scripts/pip uninstall torch torchvision torchaudio -y
.venv/Scripts/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 서버 실행
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 4. Frontend 설정

```bash
cd FE
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 환경 변수 / 민감 정보 관리

> ⚠️ **절대 GitHub에 올리지 말아야 할 파일들:**

| 파일 | 이유 |
|------|------|
| `BE/src/main/resources/application.properties` | DB 비밀번호, JWT 시크릿 포함 |
| `ai-server/.env` | 서버 경로 정보 포함 |
| `FE/.env` | API 키 등 포함 가능 |

`.gitignore`에 이미 등록되어 있으며, 각 `*.example` 파일을 참고하여 직접 작성하세요.

---

## API 구조

| 도메인 | 엔드포인트 | 설명 |
|--------|-----------|------|
| Auth | `POST /api/auth/signup`, `/login` | 회원가입 / 로그인 |
| Dataset | `GET/POST /api/datasets` | 데이터셋 CRUD |
| Annotation | `POST /api/datasets/versions/{id}/annotations` | 어노테이션 저장 |
| Training | `POST /api/training/start` | 모델 학습 시작 |
| Optimization | `POST /api/optimization/start` | 모델 경량화 |
| Evaluation | `POST /api/evaluation/start` | 모델 평가 |

---

## 학습 / 평가 / 경량화 흐름

```
FE → BE → AI Server (FastAPI)
           ├── POST /train      → YOLO 학습 → epoch 콜백
           ├── POST /evaluate   → YOLO val() → 메트릭 콜백
           └── POST /optimize   → YOLO export() → 파일 경로 콜백
```

---

## License

MIT
