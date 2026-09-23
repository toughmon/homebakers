import { Type } from '@sinclair/typebox';

export const RoleIdSchema = Type.Union([
  Type.Literal('planner'),
  Type.Literal('researcher'),
  Type.Literal('builder'),
  Type.Literal('reviewer'),
]);

export type RoleId = 'planner' | 'researcher' | 'builder' | 'reviewer';

export type RoleDefinition = {
  id: RoleId;
  label: string;
  purpose: string;
  sandbox: 'read-only' | 'workspace-write';
  instructions: string;
};

export const roleCatalog: Record<RoleId, RoleDefinition> = {
  planner: {
    id: 'planner', label: 'Planner', purpose: '요구사항을 실행 가능한 작업으로 나눕니다.', sandbox: 'read-only',
    instructions: '요구사항과 저장소를 분석해 구현 순서, 수용 기준, 주요 위험을 간결하게 작성하세요. 파일을 수정하지 마세요.',
  },
  researcher: {
    id: 'researcher', label: 'Researcher', purpose: '관련 코드와 근거를 조사합니다.', sandbox: 'read-only',
    instructions: '관련 코드 경로와 기존 동작을 조사하세요. 발견한 근거와 제약을 파일 경로와 함께 요약하세요. 파일을 수정하지 마세요.',
  },
  builder: {
    id: 'builder', label: 'Builder', purpose: '계획에 따라 코드를 구현합니다.', sandbox: 'workspace-write',
    instructions: '선행 단계의 근거를 사용해 요청된 코드를 구현하세요. 필요한 검증을 실행하고 변경 파일과 테스트 결과를 요약하세요.',
  },
  reviewer: {
    id: 'reviewer', label: 'Reviewer', purpose: '변경의 결함과 누락을 검토합니다.', sandbox: 'read-only',
    instructions: '구현 결과를 읽기 전용으로 검토하세요. 재현 가능한 결함, 회귀, 테스트 누락을 우선순위와 파일 위치를 포함해 보고하세요.',
  },
};

export const roleList = Object.values(roleCatalog).map(({ id, label, purpose, sandbox }) => ({ id, label, purpose, sandbox }));
