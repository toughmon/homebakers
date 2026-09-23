# 레시피 등록 MCP

Homebakers는 로컬 stdio MCP와 원격 Streamable HTTP MCP를 함께 제공합니다. Codex 로컬 연결은 저장소의 `.codex/config.toml`에서 시작합니다. 원격 MCP는 사용자가 자신의 AI 서비스에 **같은 공개 MCP 주소**를 등록하고 Homebakers 계정으로 로그인해 연결합니다.

서버는 두 가지 등록 도구를 제공합니다.

- `create_recipe_from_name`: “올리브치아바타 등록해줘”처럼 이름만 주면 재료, 설명, 4~5개 단계와 단계별 AI 사진을 만들고 즉시 게시합니다. 마지막 단계 사진을 표지로 사용합니다.
- `create_recipe`: 사용자가 제공한 제목, 설명, 재료, 단계와 사진을 그대로 게시합니다. 사진은 로컬 파일 경로, base64 또는 Homebakers에 이미 업로드된 URL로 전달할 수 있습니다. 표지 사진이 없으면 마지막 단계 사진을 사용합니다.

## 로컬 연결

1. `corepack pnpm install` 후 `corepack pnpm dev:local`을 실행합니다. 로컬 PGlite와 사진 저장소가 준비됩니다.
2. Homebakers에 로그인하고 **내 계정 → 레시피 등록 도구**에서 **Codex**를 선택한 뒤 **토큰 발급**을 누릅니다. Codex 토큰은 `var/mcp-token`에 자동 저장되며 Git에서 제외됩니다. 다른 연결 대상을 선택하면 별도 토큰이 발급되어 처음 한 번만 화면에 표시됩니다. 토큰은 계정·연결 대상별로 저장되고 레시피 생성과 사진 업로드에만 사용할 수 있으며 90일 후 만료됩니다. 각 연결의 **연결 해제**를 누르면 해당 토큰만 즉시 무효화됩니다.
3. 이름만으로 자동 생성하려면 저장소 루트의 `.env`에 `OPENAI_API_KEY`를 직접 입력합니다. Codex 로그인과 별도인 [OpenAI API 키](https://developers.openai.com/api/docs/quickstart)가 필요합니다. 사용자가 내용과 사진을 모두 주는 `create_recipe`에는 이 키가 필요하지 않습니다.
4. Codex를 다시 열면 프로젝트의 `.codex/config.toml`에서 MCP 서버를 시작합니다. “올리브치아바타 등록해줘” 또는 “이 사진과 레시피로 등록해줘”라고 요청할 수 있습니다.

이름만으로 등록할 때는 텍스트용 `gpt-5-mini`와 이미지용 `gpt-image-2.5-flare`를 사용합니다. 모델은 각각 `OPENAI_RECIPE_MODEL`, `OPENAI_IMAGE_MODEL`로 바꿀 수 있습니다. 단계마다 이미지 생성 API를 호출하므로 사용량에 따른 비용과 생성 시간이 발생합니다. 이미지 생성 모델 사용 권한이 없다면 API 설정을 확인해야 합니다. [OpenAI Docs 이미지 생성 안내](https://developers.openai.com/api/docs/guides/image-generation)를 참고하세요.

기본 API 주소는 `http://127.0.0.1:3002`, 결과 링크의 앱 주소는 `http://127.0.0.1:5175`입니다. 포트를 변경한 경우 `.env`의 `HOMEBAKERS_API_URL`, `HOMEBAKERS_APP_URL`을 맞춥니다. MCP API는 로컬 주소만 받습니다. 실제 PostgreSQL을 사용할 때도 API와 MCP를 같은 컴퓨터에서 실행하면 됩니다.

도구는 호출 즉시 게시합니다. 사용자가 준 정보가 불충분하면 저장 전에 필요한 재료, 단계, 사진을 먼저 요청합니다. 자동 생성 결과는 조리 시간과 재료 분량을 사용자가 확인하고 수정할 수 있습니다.

## 다른 사람의 원격 연결

1. 운영 서버에 PostgreSQL을 연결하고 `APP_ORIGIN=https://homebakers.example.com`, `MCP_PUBLIC_URL=https://homebakers.example.com/mcp`를 설정합니다. 두 값은 같은 HTTPS 출처여야 합니다. 프록시에서 `/mcp`, `/oauth`, `/.well-known`, `/api`를 API로 전달하고 웹 앱을 같은 출처에서 제공합니다. 운영에서는 로컬 PGlite를 사용할 수 없습니다.
2. 사용자는 마이페이지의 **원격 MCP 주소**를 복사해 AI 서비스의 사용자 지정 MCP 연결에 입력합니다. 서비스가 인증을 시작하면 Homebakers 로그인 화면과 **레시피 등록 연결** 동의 화면이 열립니다. 사용자가 허용하면 해당 계정의 레시피·사진 등록 권한만 부여됩니다. 마이페이지의 원격 연결 목록에서 개별 해제할 수 있습니다.
3. OAuth 클라이언트는 보호 리소스·인증 서버 메타데이터를 발견하고 DCR로 등록한 후 Authorization Code + PKCE로 로그인합니다. 접근 토큰은 1시간, 회전되는 갱신 토큰은 30일 유효합니다. 수동 발급 토큰은 Bearer 헤더를 직접 지정할 수 있는 개발용 클라이언트에도 사용할 수 있지만, 사용자용 연결에는 OAuth를 권장합니다.

로컬 주소 `http://127.0.0.1:3002/mcp`는 **이 컴퓨터에서만** 접근할 수 있습니다. 다른 사람에게 연결 주소를 제공하려면 먼저 공개 HTTPS 도메인과 운영 DB에 배포해야 합니다. 연결 대상별 수동 토큰의 라벨은 클라이언트 식별을 증명하지 않습니다. OAuth 연결은 각 클라이언트 ID·사용자별로 별도 저장됩니다.

원격 도구는 로컬 파일 경로를 읽지 않습니다. 사용자가 준 사진은 base64 또는 기존 Homebakers 이미지 URL로 전달해야 합니다. 이름만으로 사진까지 생성하려면 운영 서버에 `OPENAI_API_KEY`가 필요합니다. AI 클라이언트가 Claude나 Gemini여도 사진 생성 모델 비용은 Homebakers 서버에 발생합니다. 실제 서비스 출시 전에는 각 AI 제품의 연결 절차를 실계정으로 점검해야 합니다. [Claude 원격 MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [Gemini API 원격 MCP](https://ai.google.dev/gemini-api/docs/function-calling), [ChatGPT MCP 인증](https://developers.openai.com/plugins/build/auth)을 참고하세요. Gemini API의 MCP 지원과 일반 Gemini 앱의 사용자 지정 연결 지원은 구분해야 합니다.
