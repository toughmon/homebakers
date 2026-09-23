import { useEffect, useState } from "react";
import { Icon } from "../shared/Icon";
import { ImageUpload } from "../components/ImageUpload";
import { errorMessage } from "../shared/api";
import { readStorage, writeStorage } from "../shared/storage";
import type { Recipe, RecipeInput, User } from "../shared/types";
type Draft = {
  title: string;
  description: string;
  category: string;
  difficulty: Recipe["difficulty"];
  minutes: string;
  servings: string;
  image: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: { title: string; body: string; minutes: string; image?: string }[];
};
const empty: Draft = {
  title: "",
  description: "",
  category: "케이크",
  difficulty: "쉬움",
  minutes: "60",
  servings: "4",
  image: "/images/hero-cake.webp",
  ingredients: [{ name: "", amount: "", unit: "g" }],
  steps: [{ title: "", body: "", minutes: "" }],
};
export function WritePage({
  user,
  recipe,
  onPublish,
}: {
  user: User;
  recipe?: Recipe;
  onPublish: (recipe: RecipeInput) => Promise<void>;
}) {
  const storageKey = `oven-salon-draft-${user.id}-${recipe?.id ?? "new"}`;
  const initial: Draft = recipe
    ? {
        ...recipe,
        minutes: String(recipe.minutes),
        servings: String(recipe.servings),
        ingredients: recipe.ingredients.map((item) => ({
          ...item,
          amount: String(item.amount),
        })),
        steps: recipe.steps.map((item) => ({
          ...item,
          minutes: item.minutes ? String(item.minutes) : "",
        })),
      }
    : empty;
  const [draft, setDraft] = useState<Draft>(() =>
      readStorage(storageKey, initial),
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => writeStorage(storageKey, draft), [storageKey, draft]);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const ingredient = (
    index: number,
    key: keyof Draft["ingredients"][number],
    value: string,
  ) =>
    change(
      "ingredients",
      draft.ingredients.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  const step = (
    index: number,
    key: keyof Draft["steps"][number],
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  const moveStep = (index: number, direction: number) => {
    const items = [...draft.steps];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    change("steps", items);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNotice("");
    if (
      !draft.title.trim() ||
      !draft.description.trim() ||
      draft.ingredients.some(
        (item) =>
          !item.name.trim() ||
          Number(item.amount) <= 0 ||
          !Number.isFinite(Number(item.amount)),
      ) ||
      draft.steps.some((item) => !item.title.trim() || !item.body.trim())
    ) {
      setNotice("제목, 소개, 재료와 조리 단계를 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await onPublish({
        title: draft.title.trim(),
        description: draft.description.trim(),
        image: draft.image,
        category: draft.category,
        difficulty: draft.difficulty,
        minutes: Number(draft.minutes),
        servings: Number(draft.servings),
        ingredients: draft.ingredients.map((item) => ({
          name: item.name.trim(),
          amount: Number(item.amount),
          unit: item.unit.trim(),
        })),
        steps: draft.steps.map((item) => ({
          title: item.title.trim(),
          body: item.body.trim(),
          minutes: item.minutes ? Number(item.minutes) : undefined,
          image: item.image || undefined,
        })),
      });
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Browser storage may be disabled. */
      }
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-main container write-page">
      <div className="page-heading">
        <p className="eyebrow accent">SHARE YOUR RECIPE</p>
        <h1>
          {recipe ? "레시피를 다듬어볼까요?" : "당신의 레시피를 들려주세요"}
        </h1>
        <p>계량부터 작은 요령까지, 누군가에게는 소중한 시작이 됩니다.</p>
      </div>
      <form className="write-layout" onSubmit={submit}>
        <div className="write-main">
          <section className="form-card">
            <div className="form-section-head">
              <span>01</span>
              <div>
                <h2>레시피 소개</h2>
                <p>완성한 베이킹의 이야기를 알려주세요.</p>
              </div>
            </div>
            <label>
              레시피 제목
              <input
                value={draft.title}
                maxLength={160}
                onChange={(event) => change("title", event.target.value)}
                placeholder="예: 주말 아침의 레몬 마들렌"
                required
              />
            </label>
            <label>
              짧은 소개
              <textarea
                value={draft.description}
                maxLength={4000}
                onChange={(event) => change("description", event.target.value)}
                rows={3}
                required
              />
            </label>
            <div className="form-row">
              <label>
                종류
                <select
                  value={draft.category}
                  onChange={(event) => change("category", event.target.value)}
                >
                  {["케이크", "구움과자", "빵", "타르트", "기타"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                난이도
                <select
                  value={draft.difficulty}
                  onChange={(event) =>
                    change(
                      "difficulty",
                      event.target.value as Recipe["difficulty"],
                    )
                  }
                >
                  <option>쉬움</option>
                  <option>보통</option>
                  <option>도전</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                소요 시간 (분)
                <input
                  type="number"
                  min={1}
                  max={100000}
                  required
                  value={draft.minutes}
                  onChange={(event) => change("minutes", event.target.value)}
                />
              </label>
              <label>
                기본 분량 (인분)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={draft.servings}
                  onChange={(event) => change("servings", event.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <div className="form-section-head">
              <span>02</span>
              <div>
                <h2>필요한 재료</h2>
                <p>분량을 바꿔도 계량하기 쉽게 하나씩 적어주세요.</p>
              </div>
            </div>
            <div className="repeating-list">
              {draft.ingredients.map((item, index) => (
                <div className="ingredient-row" key={index}>
                  <input
                    aria-label={`${index + 1}번째 재료 이름`}
                    maxLength={100}
                    required
                    value={item.name}
                    onChange={(event) =>
                      ingredient(index, "name", event.target.value)
                    }
                    placeholder="재료 이름"
                  />
                  <input
                    aria-label={`${index + 1}번째 재료 양`}
                    type="number"
                    min="0.01"
                    step="any"
                    max={1000000}
                    required
                    value={item.amount}
                    onChange={(event) =>
                      ingredient(index, "amount", event.target.value)
                    }
                    placeholder="양"
                  />
                  <input
                    aria-label={`${index + 1}번째 재료 단위`}
                    maxLength={20}
                    required
                    value={item.unit}
                    onChange={(event) =>
                      ingredient(index, "unit", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    aria-label="재료 삭제"
                    disabled={draft.ingredients.length === 1}
                    onClick={() =>
                      change(
                        "ingredients",
                        draft.ingredients.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Icon name="close" size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="add-row-button"
              type="button"
              disabled={draft.ingredients.length >= 100}
              onClick={() =>
                change("ingredients", [
                  ...draft.ingredients,
                  { name: "", amount: "", unit: "g" },
                ])
              }
            >
              <Icon name="plus" size={17} />
              재료 추가
            </button>
          </section>
          <section className="form-card">
            <div className="form-section-head">
              <span>03</span>
              <div>
                <h2>차근차근 만드는 법</h2>
                <p>과정 사진과 함께 한 단계씩 설명해주세요.</p>
              </div>
            </div>
            <div className="repeating-list">
              {draft.steps.map((item, index) => (
                <div className="write-step" key={index}>
                  <div className="write-step-title">
                    <span>STEP {String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        위로
                      </button>
                      <button
                        type="button"
                        disabled={index === draft.steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        아래로
                      </button>
                      <button
                        type="button"
                        disabled={draft.steps.length === 1}
                        onClick={() =>
                          change(
                            "steps",
                            draft.steps.filter((_, i) => i !== index),
                          )
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <input
                    aria-label={`${index + 1}번째 단계 제목`}
                    maxLength={200}
                    required
                    value={item.title}
                    onChange={(event) =>
                      step(index, "title", event.target.value)
                    }
                    placeholder="예: 버터와 설탕 섞기"
                  />
                  <textarea
                    aria-label={`${index + 1}번째 단계 설명`}
                    maxLength={5000}
                    required
                    value={item.body}
                    onChange={(event) =>
                      step(index, "body", event.target.value)
                    }
                    rows={3}
                  />
                  <label className="inline-duration">
                    예상 시간 (분)
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={item.minutes}
                      onChange={(event) =>
                        step(index, "minutes", event.target.value)
                      }
                    />
                  </label>
                  <ImageUpload
                    label="과정 사진 추가"
                    onUpload={(url) => step(index, "image", url)}
                  />
                  {item.image && (
                    <div className="post-upload-preview">
                      <img src={item.image} alt={`${index + 1}단계 사진`} />
                      <button
                        type="button"
                        onClick={() => step(index, "image", "")}
                      >
                        사진 제거
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              className="add-row-button"
              type="button"
              disabled={draft.steps.length >= 100}
              onClick={() =>
                change("steps", [
                  ...draft.steps,
                  { title: "", body: "", minutes: "" },
                ])
              }
            >
              <Icon name="plus" size={17} />
              단계 추가
            </button>
          </section>
          <div className="publish-row">
            <p role={notice ? "alert" : undefined}>
              {notice || "초안은 현재 브라우저에 자동 저장됩니다."}
            </p>
            <button className="button button-dark" disabled={busy}>
              {busy ? "저장 중…" : recipe ? "수정 완료" : "레시피 올리기"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </div>
        <aside className="write-aside">
          <div className="image-choice-card">
            <p className="eyebrow accent">COVER IMAGE</p>
            <h2>레시피 표지</h2>
            <img src={draft.image} alt="레시피 표지" />
            <ImageUpload
              label="표지 사진 업로드"
              onUpload={(url) => change("image", url)}
            />
            <p>직접 구운 사진을 올리거나 기본 표지를 골라주세요.</p>
            <div className="image-choices">
              {["hero-cake", "madeleines", "sourdough", "lemon-tart"].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    className={
                      draft.image === `/images/${name}.webp` ? "selected" : ""
                    }
                    onClick={() => change("image", `/images/${name}.webp`)}
                    aria-label={`${name} 표지 선택`}
                  >
                    <img src={`/images/${name}.webp`} alt="" />
                  </button>
                ),
              )}
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
