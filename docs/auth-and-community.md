# 인증과 커뮤니티

## 실행과 설정

`corepack pnpm dev:local`은 개발 전용 PGlite DB를 `var/local-db/`에 생성하고 마이그레이션·샘플 데이터를 준비한 뒤 앱(5175)과 API(3002)를 시작합니다. 재시작해도 데이터가 유지됩니다. 기존 `.env`의 PostgreSQL 주소는 바꾸지 않습니다.

PostgreSQL을 사용할 때는 `.env`에 `DATABASE_URL`을 지정하고 `corepack pnpm db:migrate`, 필요하면 `corepack pnpm db:seed`, `corepack pnpm dev` 순서로 실행합니다. `dev`의 Homebakers 포트는 5173입니다. 업로드 디렉터리는 `UPLOAD_DIR`로 지정합니다.

## Google 로그인

Google Cloud에서 웹 애플리케이션 OAuth 클라이언트를 준비하고 클라이언트 ID를 `GOOGLE_CLIENT_ID`에 넣습니다. 프런트에는 API가 공개 클라이언트 ID만 전달합니다. 현재 방식은 Google Identity Services 버튼의 ID 토큰을 서버로 보내는 방식이므로 클라이언트 시크릿이 필요하지 않습니다.

허용된 JavaScript 원본에는 사용하는 주소를 정확히 등록합니다. 로컬 기본값은 `http://127.0.0.1:5175`, PostgreSQL 일반 개발 실행은 `http://127.0.0.1:5173`입니다. `localhost`로 접속한다면 해당 원본도 등록하고 `APP_ORIGIN`을 맞춥니다. 운영에서는 HTTPS 도메인을 등록합니다.

서버는 `google-auth-library`의 `verifyIdToken`으로 서명·발급자·만료·대상 클라이언트를 검증하고, 확인된 이메일과 Google `sub`로 계정을 처리합니다. 같은 이메일의 기존 계정은 자동 병합하지 않습니다. 기존 이메일 로그인 후 내 계정의 Google 연결을 사용합니다.

공식 문서: [Google 토큰 검증](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Google 버튼](https://developers.google.com/identity/gsi/web/guides/display-button).

## 구현 범위

- 이메일과 비밀번호 회원가입·로그인·로그아웃, 30일 서버 세션
- Google 로그인과 동일 이메일 계정 연결
- 작성자만 가능한 레시피·커뮤니티 글 수정 및 삭제
- 레시피 재료·단계·분량·표지·과정 사진, 브라우저별 초안
- 계정별 스크랩, 게시글 좋아요, 레시피·게시글 댓글 및 본인 댓글 삭제
- JPG·PNG·WebP 최대 5MB 업로드, 파일 시그니처 검사, 임의 경로 접근 제한
- 이전 localStorage 레시피·글을 사용자가 현재 계정으로 가져오는 기능

비밀번호는 개별 salt를 사용하는 scrypt 해시로 저장합니다. 세션의 원본 토큰은 HttpOnly 쿠키에만 두고 DB에는 SHA-256 해시를 저장합니다. 운영 쿠키에는 Secure와 `__Host-` 접두사를 적용합니다. 쓰기 요청은 원본과 사용자 정의 헤더를 검사합니다. 인증·댓글·업로드 요청에는 속도 제한을 적용합니다.

이메일 소유 확인 메일과 비밀번호 재설정 메일은 현재 범위에 포함되지 않습니다. 이메일 로그인은 이메일/비밀번호 방식입니다.

## 운영 실행

1. PostgreSQL에 마이그레이션을 적용합니다.
2. `corepack pnpm build`로 웹을 빌드합니다.
3. `NODE_ENV=production`, `APP_ORIGIN=https://실제도메인`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `UPLOAD_DIR`를 지정해 API를 실행합니다.
4. 같은 HTTPS 원본에서 웹 정적 파일과 `/api` 요청을 제공하도록 프록시를 구성합니다. API는 기본적으로 루프백 3002에 바인딩됩니다.
5. 업로드 디렉터리는 영속 볼륨으로 보존하고 DB와 함께 백업합니다.

운영 모드에서는 그래프·Codex 실행기 경로를 등록하지 않습니다. 로컬 제품 실행도 `ENABLE_GRAPH_API=false`로 실행합니다. 그래프 작업은 기존 일반 개발 명령에서 사용할 수 있습니다.

업로드는 현재 서버 파일시스템을 사용하므로 여러 API 인스턴스를 운영하려면 공유 스토리지나 객체 스토리지 어댑터가 필요합니다. 목록 API는 최신 500개를 반환하는 초기 서비스 범위입니다.

## 검증

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm dev:local
# 다른 터미널에서 실행 (설치된 Google Chrome 사용)
corepack pnpm test:e2e
```

API 통합 테스트는 별도 메모리 PostgreSQL 엔진에서 실행해 실제 사용자 DB를 변경하지 않습니다. 브라우저 테스트는 로컬 앱에 테스트 계정을 만들고 작성한 레시피와 글을 삭제합니다. 테스트 계정과 업로드 사진은 로컬 개발 DB·디렉터리에 남을 수 있습니다. 테스트는 회원가입, 사진 업로드, 등록·수정·삭제, 스크랩, 댓글, 좋아요, 재로그인과 390/768/1440px 화면을 확인합니다. Google 서버 검증은 모의 토큰 응답으로 분기와 audience를 확인하며, 실제 Google 로그인은 클라이언트 ID를 설정한 환경에서 최종 확인해야 합니다.
