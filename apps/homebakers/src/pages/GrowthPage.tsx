import { AchievementBadge } from "../components/AchievementBadge";
import { useEffect, useState } from "react";
import { api, errorMessage } from "../shared/api";
import type {
  Challenge,
  Growth,
  Journal,
  JournalInput,
  Recipe,
} from "../shared/types";
const today = () =>
  new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
export function GrowthPage({ recipes }: { recipes: Recipe[] }) {
  const [growth, setGrowth] = useState<Growth | null>(null),
    [challenge, setChallenge] = useState<Challenge | null>(null),
    [journal, setJournal] = useState<Journal[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<string>(),
    [selected, setSelected] = useState("");
  const blank = (): JournalInput => ({
    recipeId: recipes[0]?.id ?? "",
    bakedOn: today(),
    body: "",
    changes: "",
    outcome: "성공",
  });
  const [draft, setDraft] = useState<JournalInput>(blank);
  async function load() {
    const [g, c, j] = await Promise.all([
      api.growth(),
      api.challenge(),
      api.journal(),
    ]);
    setGrowth(g);
    setChallenge(c);
    setJournal(j);
  }
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const eligible = journal.filter(
    (j) =>
      j.image &&
      j.category === challenge?.category &&
      j.bakedOn >= challenge.weekStart &&
      j.bakedOn < challenge.weekEnd,
  );
  return (
    <main className="page-main container growth-page">
      <a href="#/account" className="back-link">
        ← 마이페이지
      </a>
      <div className="growth-heading">
        <div>
          <p className="eyebrow accent">MY BAKING JOURNEY</p>
          <h1>나의 베이킹 성장</h1>
          <p>오늘의 작은 시도가 내일의 맛있는 자신감으로.</p>
        </div>
        <button
          className="button button-dark"
          type="button"
          onClick={() =>
            document
              .getElementById("journal-compose")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          ＋ 베이킹 기록 남기기
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!growth && <p>성장 기록을 불러오는 중…</p>}
      {growth && (
        <section className="growth-card growth-overview">
          <div className="growth-level-layout">
            <div className="growth-level-art">
              <AchievementBadge id="first-bake" earned decorative />
              <span>BAKER LEVEL {growth.level}</span>
            </div>
            <div className="growth-level-copy">
              <p className="eyebrow">한 번 구울 때마다, 한 걸음 더</p>
              <h2>
                Lv.{growth.level} {growth.levelName}
              </h2>
              <strong>
                {growth.xp} XP · 사진으로 기록한 레시피 {growth.bakeCount}개
              </strong>
              {growth.nextLevel ? (
                <>
                  <progress
                    aria-label="다음 레벨까지 경험치"
                    value={growth.xp - growth.levelMinimum}
                    max={growth.nextLevel.minimum - growth.levelMinimum}
                  />
                  <p>
                    {growth.nextLevel.name}까지{" "}
                    {growth.nextLevel.minimum - growth.xp} XP
                  </p>
                </>
              ) : (
                <p>최고 레벨에 도달했어요!</p>
              )}
            </div>
            <div className="growth-stats">
              <div>
                <strong>{journal.length}</strong>
                <span>남긴 베이킹 기록</span>
              </div>
              <div>
                <strong>
                  {growth.badges.filter((b) => b.earned).length}
                  <small> / 6</small>
                </strong>
                <span>모은 배지</span>
              </div>
            </div>
          </div>
          <div className="growth-section-heading">
            <div>
              <p className="eyebrow accent">LITTLE ACHIEVEMENTS</p>
              <h2>나의 배지 컬렉션</h2>
              <p>직접 굽고, 함께 나누며 하나씩 모아보세요.</p>
            </div>
          </div>{" "}
          <div className="badge-grid">
            {growth.badges.map((b) => (
              <article
                key={b.id}
                className={b.earned ? "badge earned" : "badge"}
              >
                <AchievementBadge id={b.id} earned={b.earned} />
                <strong>{b.name}</strong>
                <p>{b.description}</p>
                <small>{b.earned ? "획득" : "도전 중"}</small>
              </article>
            ))}
          </div>
          <div className="growth-ledger">
            <details>
              <summary>경험치는 어떻게 쌓이나요?</summary>{" "}
              <p>
                사진 기록은 레시피마다 15 XP, 주간 도전은 30 XP, 도움 됐어요는 2
                XP(댓글당 최대 10명), 답변 채택은 25 XP를 받아요. 경험치는 성장
                지표입니다. 후기와 기록의 같은 레시피는 한 번만 적립되고,
                삭제·평가 취소 시 다시 계산됩니다.
              </p>
            </details>
            <details>
              <summary>경험치 내역</summary>
              {growth.history.length ? (
                growth.history.map((h) => (
                  <p key={h.eventKey}>
                    {h.reason} · {h.active ? `+${h.points} XP` : "취소됨"} ·{" "}
                    {new Date(h.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                ))
              ) : (
                <p>첫 사진 기록을 남겨보세요.</p>
              )}
            </details>
          </div>
        </section>
      )}
      {challenge && (
        <section className="growth-card growth-challenge">
          <div className="challenge-cover">
            {recipes.find((r) => r.category === challenge.category) ? (
              <img
                src={
                  recipes.find((r) => r.category === challenge.category)!.image
                }
                alt="이번 주 베이킹 도전"
              />
            ) : (
              <AchievementBadge id="weekly" earned decorative />
            )}
            <span>WEEKLY BAKE</span>
          </div>
          <div className="challenge-content">
            <p className="eyebrow accent">이번 주, 함께 구워요 · ＋30 XP</p>
            <h2>{challenge.title}</h2>
            <p>
              {challenge.weekStart} ~ {challenge.weekEnd} 00:00 (한국 시간)
            </p>
            <p>{challenge.description}</p>
            {!challenge.joined ? (
              <button
                className="button button-dark"
                disabled={busy}
                onClick={() => action(() => api.joinChallenge(challenge.id))}
              >
                도전 참여하기
              </button>
            ) : (
              <>
                <p>
                  {eligible.some((j) => j.id === challenge.journalId)
                    ? "✓ 도전 완료 · 30 XP"
                    : "참여 중 · 아래에 이번 주 사진 기록을 남겨주세요."}
                </p>
                <label>
                  도전에 공개할 내 기록
                  <select
                    aria-label="도전에 공개할 내 기록"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">기록 선택</option>
                    {eligible.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.recipeTitle} · {j.bakedOn}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  제출하면 이름, 완성 사진, 레시피 이름과 결과 설명이 다른
                  참여자에게 공개됩니다.
                </p>
                <button
                  className="button button-dark"
                  disabled={busy || !eligible.some((j) => j.id === selected)}
                  onClick={() =>
                    action(() => api.submitChallenge(challenge.id, selected))
                  }
                >
                  도전 기록 제출
                </button>
              </>
            )}
          </div>
          <div className="journal-grid challenge-gallery">
            {challenge.participants.map((p, i) => (
              <article key={i}>
                <img src={p.image} alt={`${p.name}의 ${p.recipeTitle}`} />
                <strong>
                  {p.name} · {p.recipeTitle}
                </strong>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="growth-journal-section">
        <div className="growth-section-heading">
          <div>
            <p className="eyebrow accent">MY BAKING NOTE</p>
            <h2>개인 베이킹 기록</h2>
            <p>
              기록은 나만 볼 수 있어요. 같은 레시피도 여러 번 기록하며 재료
              변경과 결과를 비교할 수 있습니다.
            </p>
          </div>
          <span className="journal-private">나만 보는 기록</span>
        </div>
        <form
          id="journal-compose"
          className="journal-form journal-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await api.saveJournal(draft, editing);
              setDraft(blank());
              setEditing(undefined);
            });
          }}
        >
          <div className="journal-compose-heading">
            <h3>{editing ? "베이킹 기록 수정" : "오늘은 무엇을 구웠나요?"}</h3>
            <span>사진 기록 ＋15 XP</span>
          </div>
          <div className="journal-metadata">
            <label>
              레시피
              <select
                aria-label="레시피"
                required
                value={draft.recipeId}
                onChange={(e) =>
                  setDraft({ ...draft, recipeId: e.target.value })
                }
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              구운 날짜
              <input
                type="date"
                required
                max={today()}
                value={draft.bakedOn}
                onChange={(e) =>
                  setDraft({ ...draft, bakedOn: e.target.value })
                }
              />
            </label>
            <label>
              결과
              <select
                aria-label="결과"
                value={draft.outcome}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    outcome: e.target.value as JournalInput["outcome"],
                  })
                }
              >
                {["성공", "아쉬움", "다시 도전"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="journal-compose-body">
            <div className="journal-photo-column">
              <label
                className={
                  draft.image
                    ? "journal-photo-drop has-photo"
                    : "journal-photo-drop"
                }
              >
                {" "}
                <input
                  className="sr-only"
                  aria-label="완성 사진"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void action(async () => {
                        const { url } = await api.upload(file);
                        setDraft((d) => ({ ...d, image: url }));
                      });
                  }}
                />
                {draft.image ? (
                  <>
                    <img src={draft.image} alt="기록할 완성 사진" />
                    <span className="photo-change">사진 바꾸기</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M8 14h9l3-5h8l3 5h9v25H8Z" />
                      <circle cx="24" cy="26" r="8" />
                      <path d="M34 19h2" />
                    </svg>
                    <strong>나의 완성 사진</strong>
                    <span>클릭해서 사진을 올려주세요</span>
                    <small>JPG · PNG · WEBP</small>
                  </>
                )}
              </label>
              {draft.image && (
                <button
                  className="photo-remove"
                  type="button"
                  disabled={busy}
                  onClick={() => setDraft({ ...draft, image: undefined })}
                >
                  사진 제거
                </button>
              )}
              <p className="journal-photo-tip">
                완벽하지 않아도 괜찮아요.
                <br />
                오늘의 시도 자체가 소중한 기록이에요.
              </p>
            </div>
            <div className="journal-notes">
              <label>
                결과와 배운 점
                <textarea
                  required
                  placeholder="식감은 어땠나요? 다음에는 무엇을 바꿔보고 싶나요?"
                  maxLength={2000}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </label>
              <label>
                재료·방법 변경
                <textarea
                  maxLength={2000}
                  placeholder="설탕 10g 줄이기, 굽는 시간 2분 추가…"
                  value={draft.changes}
                  onChange={(e) =>
                    setDraft({ ...draft, changes: e.target.value })
                  }
                />
              </label>
            </div>
          </div>
          <div className="journal-compose-footer">
            <span>사진과 결과를 나만의 노트에 남겨보세요.</span>
            <div className="owner-actions">
              <button
                className="button button-dark"
                disabled={busy || !draft.recipeId}
              >
                {editing ? "기록 수정" : "기록 저장"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => {
                    setEditing(undefined);
                    setDraft(blank());
                  }}
                >
                  수정 취소
                </button>
              )}
            </div>
          </div>
        </form>
        <div className="journal-grid">
          {journal.map((j) => (
            <article key={j.id}>
              {j.image && (
                <img src={j.image} alt={`${j.recipeTitle} 완성 사진`} />
              )}
              <h3>{j.recipeTitle}</h3>
              <small>
                {j.bakedOn} · {j.outcome}
              </small>
              <p>{j.body}</p>
              {j.changes && <p>변경: {j.changes}</p>}
              <div className="owner-actions">
                {j.recipeId && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(j.id);
                      setDraft({
                        recipeId: j.recipeId!,
                        bakedOn: j.bakedOn,
                        body: j.body,
                        changes: j.changes,
                        outcome: j.outcome,
                        image: j.image ?? undefined,
                      });
                      document
                        .getElementById("journal-compose")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                  >
                    수정
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm("베이킹 기록을 삭제할까요?"))
                      void action(() => api.deleteJournal(j.id));
                  }}
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
        {!journal.length && (
          <div className="journal-empty">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M12 7h25v34H12ZM7 14h10M7 23h10M7 32h10M23 16h8M23 23h8M23 30h5" />
            </svg>
            <strong>첫 페이지를 채워볼까요?</strong>
            <p>오늘 구운 베이킹의 사진과 이야기를 남겨주세요.</p>
          </div>
        )}
      </section>
    </main>
  );
}
