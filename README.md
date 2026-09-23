# Homebakers

홈베이킹 레시피와 커뮤니티 React 앱에 그래프 엔지니어링 워크스페이스를 함께 구성한 프로젝트입니다. 그래프 편집기, Fastify API, PostgreSQL 저장소, 공유 그래프 코어가 **이 저장소 안에** 있습니다.

## 구조

```text
apps/
  homebakers/   기존 레시피·커뮤니티 React 앱
  graph-web/    React Flow 그래프 편집기와 실행 기록 화면
  api/          Fastify 그래프 API, PostgreSQL 저장소, Codex 실행기
packages/
  graph-core/   그래프 문서·노드·역할·검증·실행 계획
harness/        Homebakers 역할 그래프 정의와 실행 명령
db/migrations/ PostgreSQL 그래프·실행 기록 스키마
.codex/agents/  Codex에서 직접 사용할 역할 설정
```

역할과 실행 흐름을 포함한 설계는 [그래프 엔지니어링 구조](docs/graph-engineering.md)에 정리했습니다.

## 실행

Homebakers만 바로 실행하려면 Docker 없이 아래 명령을 사용하세요. 데이터는 `var/local-db/`, 업로드 사진은 `var/uploads/`에 유지됩니다.

```bash
corepack pnpm install
corepack pnpm dev:local
```

앱은 `http://127.0.0.1:5175`에서 열립니다. 최초 실행 시 로컬 DB 마이그레이션과 샘플 레시피를 준비합니다. `APP_PORT` 환경변수로 포트를 바꿀 수 있습니다.

Google 로그인 설정, API 및 운영 실행 방법은 [인증과 커뮤니티 개발 안내](docs/auth-and-community.md)를 참고하세요.

레시피 이름만으로 단계별 사진까지 생성해 게시하거나 사용자가 준 레시피·사진을 등록하려면 [레시피 등록 MCP 안내](docs/recipe-mcp.md)를 참고하세요.

Node.js 24, Corepack, PostgreSQL 18 또는 Docker, 로그인된 Codex CLI가 필요합니다.

```bash
corepack pnpm install
docker compose up -d --wait
cp .env.example .env
corepack pnpm db:migrate
corepack pnpm dev
```

- Homebakers 앱: `http://127.0.0.1:5173`
- 그래프 편집기: `http://127.0.0.1:5174`
- Fastify API: `http://127.0.0.1:3002`
- PostgreSQL: 로컬 포트 `5433`

Docker가 없다면 별도 PostgreSQL을 준비하고 `.env`의 `DATABASE_URL`을 지정하세요. `corepack pnpm --filter @homebakers/app dev`로 기존 화면만 실행할 수도 있습니다.

## 역할 그래프

```bash
corepack pnpm harness:validate
corepack pnpm harness:sync
corepack pnpm harness:run -- "레시피 검색 필터 추가"
```

`harness:sync`는 [`harness/graph.json`](harness/graph.json)을 이 저장소의 PostgreSQL에 등록합니다. 등록 후 그래프 편집기에서 볼 수 있습니다. `harness:run`은 그래프를 동기화하고 Planner·Researcher → Builder → Reviewer 순서로 Codex 역할을 실행합니다. 역할별 지시사항은 [`harness/roles.json`](harness/roles.json)에 있습니다. 등록된 그래프 ID는 Git에서 제외한 `harness/.state.json`에 저장합니다.

## 확인

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Homebakers는 이메일 회원가입·로그인, Google 로그인·계정 연결, 레시피 등록·수정·삭제, 표지·단계 사진 업로드, 재료 분량 조절, 스크랩, 커뮤니티 글·댓글·좋아요를 지원합니다. 계정과 게시물은 DB에 저장되며, 작성자만 자신의 글과 댓글을 변경할 수 있습니다. 브라우저에는 작성 초안과 이전 시안 데이터만 보존합니다. 이전 시안 데이터는 내 계정에서 가져올 수 있습니다.

Google 로그인을 실제 계정으로 사용하려면 `.env`의 `GOOGLE_CLIENT_ID`와 Google Cloud의 허용된 JavaScript 원본을 설정해야 합니다. Google 토큰은 서버에서 공식 라이브러리로 검증합니다. 운영 모드에서는 그래프 실행기 API가 노출되지 않습니다.

Stitch 프로젝트 URL은 이 환경에서 디자인 내용을 읽을 수 없어, 기존 화면은 대화에서 정한 오븐 살롱의 모바일 우선·고급 베이킹 매거진 방향을 기준으로 구성했습니다. Stitch 내보내기 파일이나 화면 캡처가 제공되면 색상, 간격, 타이포그래피와 구성요소를 해당 디자인에 맞춰 조정할 수 있습니다.
