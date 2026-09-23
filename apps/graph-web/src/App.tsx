import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MiniMap,
  ReactFlow, useReactFlow, type Connection, type EdgeChange, type NodeChange,
} from '@xyflow/react';
import { nodeDefinitions, nodeRegistry, roleCatalog, type GraphValidationError, type NodeKind, type RoleId } from '@homebakers/graph-core';
import { ApiError, graphApi, type GraphRecord, type GraphSummary, type RunRecord, type RunSummary, type TemplateSummary } from './features/graph/api';
import { toDocument, toFlow, type EditorEdge, type EditorNode } from './features/graph/flow';
import { GraphNode } from './features/graph/GraphNode';

const nodeTypes = { graph: GraphNode };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

export default function App() {
  const flow = useReactFlow<EditorNode, EditorEdge>();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [graph, setGraph] = useState<GraphRecord | null>(null);
  const [name, setName] = useState('');
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [edges, setEdges] = useState<EditorEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<GraphValidationError[]>([]);
  const [runTask, setRunTask] = useState('');
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [runHistory, setRunHistory] = useState<RunSummary[]>([]);
  const loadSequence = useRef(0);
  const restoringViewport = useRef(false);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  const openGraph = useCallback(async (id: string) => {
    const sequence = ++loadSequence.current;
    restoringViewport.current = false;
    try {
      setBusy(true);
      const [loaded, history] = await Promise.all([graphApi.get(id), graphApi.listRuns(id)]);
      const latestRun = history[0] ? await graphApi.getRun(history[0].id) : null;
      if (sequence !== loadSequence.current) return;
      const values = toFlow(loaded.document);
      restoringViewport.current = true;
      setGraph(loaded);
      setName(loaded.name);
      setNodes(values.nodes);
      setEdges(values.edges);
      setSelectedNodeId(null);
      setValidationErrors([]);
      setRunHistory(history);
      setActiveRun(latestRun);
      setDirty(false);
      setMessage('');
      requestAnimationFrame(() => {
        void flow.setViewport(loaded.document.viewport).finally(() => {
          if (sequence !== loadSequence.current) return;
          restoringViewport.current = false;
          setDirty(false);
        });
      });
    } catch (error) {
      if (sequence === loadSequence.current) {
        restoringViewport.current = false;
        setMessage(errorMessage(error));
      }
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [flow]);

  useEffect(() => {
    if (!activeRun || !graph || activeRun.graphId !== graph.id || !['queued', 'running'].includes(activeRun.status)) return;
    const timer = window.setInterval(() => {
      void graphApi.getRun(activeRun.id).then((updated) => {
        setActiveRun(updated);
        if (!['queued', 'running'].includes(updated.status)) void graphApi.listRuns(updated.graphId).then(setRunHistory);
      }).catch((error) => setMessage(errorMessage(error)));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeRun?.id, activeRun?.status, graph?.id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([graphApi.list(), graphApi.templates()]).then(([list, available]) => {
      if (cancelled) return;
      setGraphs(list);
      setTemplates(available);
      if (list[0]) void openGraph(list[0].id);
    }).catch((error) => { if (!cancelled) setMessage(errorMessage(error)); });
    return () => { cancelled = true; };
  }, [openGraph]);

  const createGraph = async (template: TemplateSummary) => {
    if (dirty && !window.confirm('저장하지 않은 변경 사항이 있습니다. 새 그래프를 만드시겠습니까?')) return;
    try {
      setBusy(true);
      const created = await graphApi.create(template.key === 'empty' ? '새 그래프' : template.name, template.key);
      setGraphs(await graphApi.list());
      await openGraph(created.id);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const addNode = (kind: NodeKind) => {
    if (!graph) return;
    const definition = nodeRegistry[kind];
    const position = flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const node: EditorNode = {
      id: crypto.randomUUID(), type: 'graph', position,
      data: { kind, config: { ...definition.defaultConfig } },
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
    setDirty(true);
    setValidationErrors([]);
  };

  const onNodesChange = useCallback((changes: NodeChange<EditorNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
    if (changes.some((change) => change.type !== 'select' && change.type !== 'dimensions')) setDirty(true);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<EditorEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
    if (changes.some((change) => change.type !== 'select')) setDirty(true);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), type: 'smoothstep' }, current));
    setDirty(true);
    setValidationErrors([]);
  }, []);

  const updateConfig = (key: string, value: string) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId
      ? { ...node, data: { ...node.data, config: { ...node.data.config, [key]: value } } }
      : node));
    setDirty(true);
  };

  const currentDocument = () => toDocument(nodes, edges, flow.getViewport());

  const validate = async () => {
    try {
      const result = await graphApi.validate(currentDocument());
      setValidationErrors(result.errors);
      setMessage(result.valid ? '그래프 검증을 통과했습니다.' : `${result.errors.length}개의 오류가 있습니다.`);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  const save = async () => {
    if (!graph) return;
    try {
      setBusy(true);
      const saved = await graphApi.save(graph.id, name, currentDocument(), graph.revision);
      setGraph(saved);
      setGraphs(await graphApi.list());
      setDirty(false);
      setValidationErrors([]);
      setMessage('저장했습니다.');
    } catch (error) {
      if (error instanceof ApiError) setValidationErrors(error.errors);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const startRun = async () => {
    if (!graph || !runTask.trim() || dirty) return;
    try {
      setBusy(true);
      const started = await graphApi.startRun(graph.id, runTask.trim());
      setActiveRun(started);
      setRunHistory(await graphApi.listRuns(graph.id));
      setMessage('역할 그래프 실행을 시작했습니다.');
    } catch (error) {
      if (error instanceof ApiError) setValidationErrors(error.errors);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◈</span><div><strong>Graph Studio</strong><small>엔지니어링 워크스페이스</small></div></div>
        <section className="sidebar-section">
          <div className="section-heading"><span>내 그래프</span><span className="count">{graphs.length}</span></div>
          <div className="graph-list">
            {graphs.map((item) => <button key={item.id} className={`graph-list-item ${graph?.id === item.id ? 'active' : ''}`}
              onClick={() => { if (!dirty || window.confirm('저장하지 않은 변경 사항이 있습니다. 다른 그래프를 여시겠습니까?')) void openGraph(item.id); }}>
              <span className="graph-list-icon">⌘</span><span>{item.name}</span><small>v{item.revision}</small>
            </button>)}
            {!graphs.length && <p className="muted small">아직 그래프가 없습니다.</p>}
          </div>
        </section>
        <section className="sidebar-section">
          <div className="section-heading">새 그래프</div>
          {templates.map((template) => <button key={template.key} className="template-button" disabled={busy} onClick={() => void createGraph(template)}>
            <span>＋</span><span><strong>{template.name}</strong><small>{template.description}</small></span>
          </button>)}
        </section>
        <div className="sidebar-footer">GRAPH ENGINEERING / 01</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title"><div className="eyebrow">WORKSPACE / EDITOR</div>
            <input aria-label="그래프 이름" placeholder="그래프 이름" value={name} disabled={!graph || busy}
              onChange={(event) => { setName(event.target.value); setDirty(true); }} />
          </div>
          <div className="topbar-actions">
            <span className={`save-state ${dirty ? 'is-dirty' : ''}`}>{graph ? dirty ? '저장되지 않음' : `저장됨 · v${graph.revision}` : '그래프를 선택하세요'}</span>
            <button className="button button-secondary" disabled={!graph || busy} onClick={() => void validate()}>검증</button>
            <button className="button button-primary" disabled={!graph || busy || !dirty} onClick={() => void save()}>저장</button>
          </div>
        </header>

        {message && <div className="notice" role="status"><span>{message}</span><button aria-label="알림 닫기" onClick={() => setMessage('')}>×</button></div>}

        <div className="workspace">
          <div className="canvas-area">
            {graph ? <ReactFlow<EditorNode, EditorEdge>
              nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              onMoveEnd={(_, viewport) => {
                if (restoringViewport.current) return;
                const saved = graph.document.viewport;
                if (Math.abs(viewport.x - saved.x) > 0.0001 || Math.abs(viewport.y - saved.y) > 0.0001 || Math.abs(viewport.zoom - saved.zoom) > 0.0001) setDirty(true);
              }}
              nodesDraggable={!busy} nodesConnectable={!busy} elementsSelectable={!busy}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView={false}
            >
              <Background gap={24} color="#dde3e9" />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" nodeColor={(node) => nodeRegistry[(node.data as EditorNode['data']).kind]?.color ?? '#94a3b8'} />
            </ReactFlow> : <div className="empty-state"><span>◈</span><h2>첫 그래프를 만들어 보세요</h2><p>왼쪽에서 빈 그래프 또는 기본 파이프라인을 선택하세요.</p></div>}
          </div>
          <aside className="inspector">
            <div className="inspector-header"><div className="eyebrow">COMPONENTS</div><h2>{selectedNode ? '노드 속성' : '노드 팔레트'}</h2></div>
            {selectedNode ? <div className="inspector-body">
              <div className="selected-kind" style={{ '--node-color': nodeRegistry[selectedNode.data.kind].color } as React.CSSProperties}>
                <span className="kind-dot" />{nodeRegistry[selectedNode.data.kind].label}
              </div>
              <p className="muted small">{nodeRegistry[selectedNode.data.kind].description}</p>
              {nodeRegistry[selectedNode.data.kind].fields.map((field) => <label className="field" key={field.key}>
                <span>{field.label}</span>
                {field.options
                  ? <select value={selectedNode.data.config[field.key] ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)} disabled={busy}>
                      {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  : field.multiline
                  ? <textarea value={selectedNode.data.config[field.key] ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)} rows={5} disabled={busy} />
                  : <input value={selectedNode.data.config[field.key] ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)} disabled={busy} />}
              </label>)}
              <button className="text-button" onClick={() => setSelectedNodeId(null)}>← 팔레트로 돌아가기</button>
            </div> : <div className="inspector-body">
              <p className="muted small">노드를 클릭해 캔버스에 추가하세요.</p>
              <div className="node-palette">{nodeDefinitions.map((definition) => <button key={definition.kind} className="palette-item" disabled={!graph}
                onClick={() => addNode(definition.kind)}>
                <span className="palette-icon" style={{ background: definition.color }}>◇</span>
                <span><strong>{definition.label}</strong><small>{definition.description}</small></span><span className="palette-add">＋</span>
              </button>)}</div>
            </div>}
            {!!validationErrors.length && <div className="validation-panel"><strong>검증 오류 {validationErrors.length}개</strong>
              {validationErrors.map((error, index) => <p key={`${error.code}-${index}`}>{error.message} <small>{error.nodeId ?? error.edgeId ?? ''}</small></p>)}
            </div>}
            <div className="inspector-footer">노드를 연결하고 검증한 뒤 저장하세요.</div>
          </aside>
        </div>
        <section className="run-panel">
          <div className="run-panel__setup">
            <div className="eyebrow">CODEX HARNESS</div>
            <h2>역할 그래프 실행</h2>
            <p>저장된 그래프의 연결 순서대로 Codex 역할을 실행합니다.</p>
            <div className="run-form">
              <input aria-label="실행 작업" placeholder="예: 인증 흐름의 오류를 수정하고 검토해 줘" value={runTask}
                onChange={(event) => setRunTask(event.target.value)} disabled={!graph || busy} />
              <button className="button button-primary" disabled={!graph || busy || dirty || !runTask.trim() || activeRun?.status === 'running' || activeRun?.status === 'queued'}
                onClick={() => void startRun()}>실행</button>
            </div>
            {dirty && <small className="run-hint">실행 전 그래프를 저장하세요.</small>}
          </div>
          <div className="run-panel__result">
            <div className="run-panel__heading"><strong>실행 기록</strong>
              <select aria-label="실행 기록 선택" value={activeRun?.id ?? ''} onChange={(event) => { if (event.target.value) void graphApi.getRun(event.target.value).then(setActiveRun); }}>
                <option value="">기록 선택</option>
                {runHistory.map((run) => <option key={run.id} value={run.id}>{new Date(run.createdAt).toLocaleString()} · {run.status}</option>)}
              </select>
            </div>
            {activeRun ? <>
              <div className={`run-status run-status--${activeRun.status}`}>{activeRun.status.toUpperCase()} · 그래프 v{activeRun.graphRevision}</div>
              <div className="run-steps">{activeRun.steps.map((step) => <details key={step.nodeId}>
                <summary><span>{roleCatalog[step.role as RoleId]?.label ?? step.role}</span><em>{step.status}</em></summary>
                <pre>{step.output ?? step.error ?? '결과를 기다리는 중입니다.'}</pre>
              </details>)}</div>
              {activeRun.error && <p className="run-error">{activeRun.error}</p>}
            </> : <p className="muted small">실행하면 역할별 결과가 여기에 쌓입니다.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
