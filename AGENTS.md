# Homebakers 작업 지침

이 저장소는 Homebakers React 앱과 그래프 엔지니어링 워크스페이스입니다.

- Homebakers 화면은 `apps/homebakers/`에 있습니다. 해시 라우팅은 `apps/homebakers/src/app/App.tsx`에서 처리합니다.
- 계정·레시피·스크랩·커뮤니티·댓글은 `apps/api/src/homebakers/` API와 DB에 저장합니다. 브라우저 저장소에는 작성 초안과 기존 시안 데이터만 보존하며, 내 계정에서 기존 데이터를 가져올 수 있습니다. `apps/homebakers/src/shared/types.ts` 계약의 호환성을 확인합니다.
- `corepack pnpm dev:local`은 Docker 없이 로컬 DB와 Homebakers를 실행합니다. 인증 및 CRUD 변경 시 API 통합 테스트와 `corepack pnpm test:e2e`를 확인합니다.
- 그래프 문서·검증·역할·실행 계획은 `packages/graph-core/`에 있습니다.
- 그래프 편집기는 `apps/graph-web/`, Fastify API와 Codex 실행기는 `apps/api/`, PostgreSQL 마이그레이션은 `db/migrations/`에 있습니다.
- 프로젝트 역할 그래프는 `harness/graph.json`, 역할 지시사항은 `harness/roles.json`, Codex 사용자 정의 에이전트는 `.codex/agents/`에 있습니다.
- 변경 후 `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`를 실행합니다.
