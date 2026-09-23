import { useEffect, useState } from "react";
import { Icon } from "../shared/Icon";
import type { Recipe } from "../shared/types";

export function RecipeDetailPage({
  recipe,
  saved,
  onToggleSave,
  liked,
  onToggleLike,
  followed,
  onToggleFollow,
  own,
  onAddShopping,
}: {
  recipe: Recipe;
  saved: boolean;
  onToggleSave: (id: string) => void;
  liked: boolean;
  onToggleLike: (id: string) => void;
  followed: boolean;
  onToggleFollow: () => void;
  own: boolean;
  onAddShopping: (servings: number) => Promise<boolean> | boolean;
}) {
  const [servings, setServings] = useState(recipe.servings);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [cookingMode, setCookingMode] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!running || deadline === null) return;
    const timer = window.setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250,
    );
    return () => window.clearInterval(timer);
  }, [running, deadline]);

  useEffect(() => {
    if (remaining === 0) {
      setRunning(false);
      setDeadline(null);
    }
  }, [remaining]);

  const toggleIngredient = (index: number) =>
    setCheckedIngredients((items) =>
      items.includes(index)
        ? items.filter((item) => item !== index)
        : [...items, index],
    );
  const toggleStep = (index: number) =>
    setCheckedSteps((items) =>
      items.includes(index)
        ? items.filter((item) => item !== index)
        : [...items, index],
    );
  const formatAmount = (amount: number) =>
    Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
  const timeText =
    remaining === null
      ? ""
      : `${Math.floor(remaining / 60)
          .toString()
          .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;

  return (
    <main className={`detail-main ${cookingMode ? "is-cooking" : ""}`}>
      <div className="container">
        <a className="back-link" href="#/recipes">
          <Icon name="arrowLeft" size={17} /> 모든 레시피
        </a>
        <div className="detail-intro">
          <div>
            <p className="eyebrow accent">
              {recipe.englishTitle.toUpperCase()}
            </p>
            <h1>{recipe.title}</h1>
            <p className="detail-description">{recipe.description}</p>
            <div className="detail-tags">
              <span>
                <Icon name="clock" size={17} /> {recipe.minutes}분
              </span>
              <span>{recipe.difficulty}</span>
              <span>{recipe.servings}인분</span>
            </div>
          </div>
          <div className="detail-actions">
            <button
              className={`button button-outline ${liked ? "is-saved" : ""}`}
              onClick={() => onToggleLike(recipe.id)}
              aria-pressed={liked}
            >
              <Icon
                name="heart"
                size={17}
                fill={liked ? "currentColor" : "none"}
              />{" "}
              좋아요 {recipe.likes}
            </button>
            <button
              className={`button button-outline ${saved ? "is-saved" : ""}`}
              onClick={() => onToggleSave(recipe.id)}
              aria-pressed={saved}
            >
              <Icon
                name="bookmark"
                size={17}
                fill={saved ? "currentColor" : "none"}
              />{" "}
              {saved ? "저장됨" : "저장하기"}
            </button>
          </div>
        </div>
        <div className="detail-hero">
          <img src={recipe.image} alt={recipe.title} />
        </div>
        <div className="detail-author">
          <span className="avatar">{recipe.author.slice(0, 1)}</span>
          <div>
            <strong>{recipe.author}</strong>
            <p>정성껏 나누는 홈베이킹 레시피</p>
          </div>
          {!own && recipe.authorId && (
            <button
              className="button button-outline"
              onClick={onToggleFollow}
              aria-pressed={followed}
            >
              {followed ? "팔로잉" : "베이커 팔로우"}
            </button>
          )}
          <span className="detail-author-mark">OVEN SALON RECIPE</span>
        </div>
        <div className="recipe-utility-actions">
          <button
            className="button button-outline"
            onClick={() => setCookingMode((value) => !value)}
          >
            {cookingMode ? "조리 모드 종료" : "조리 모드 시작"}
          </button>
          <button
            className="button button-outline"
            onClick={async () => {
              try {
                if (await onAddShopping(servings))
                  setNotice("장보기 목록에 담았습니다.");
              } catch (error) {
                setNotice(
                  error instanceof Error ? error.message : "담지 못했습니다.",
                );
              }
            }}
          >
            재료 {servings}인분 장보기 목록에 담기
          </button>
          <a className="text-link" href="#/shopping">
            장보기 목록 보기 →
          </a>
        </div>
        {notice && (
          <p className="recipe-utility-notice" role="status">
            {notice}
          </p>
        )}
        <div className="detail-content">
          <aside className="ingredient-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow accent">WHAT YOU NEED</p>
                <h2>재료 준비</h2>
              </div>
              <span className="small-spark">✳</span>
            </div>
            <div className="serving-control">
              <span>만들 분량</span>
              <div>
                <button
                  onClick={() => setServings((value) => Math.max(1, value - 1))}
                  aria-label="분량 줄이기"
                >
                  −
                </button>
                <strong>{servings}인분</strong>
                <button
                  onClick={() => setServings((value) => value + 1)}
                  aria-label="분량 늘리기"
                >
                  +
                </button>
              </div>
            </div>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`}>
                  <label
                    className={
                      checkedIngredients.includes(index) ? "checked" : ""
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checkedIngredients.includes(index)}
                      onChange={() => toggleIngredient(index)}
                    />
                    <span className="custom-check">
                      <Icon name="check" size={13} />
                    </span>
                    <span>{ingredient.name}</span>
                    <strong>
                      {formatAmount(
                        (ingredient.amount * servings) / recipe.servings,
                      )}
                      {ingredient.unit}
                    </strong>
                  </label>
                </li>
              ))}
            </ul>
            <p className="ingredient-hint">
              재료를 준비하며 하나씩 체크해보세요.
            </p>
          </aside>
          <section className="steps-panel">
            <div className="steps-heading">
              <p className="eyebrow accent">STEP BY STEP</p>
              <h2>차근차근 따라 굽기</h2>
              <p>작은 단계를 하나씩 따라가면 어느새 완성이에요.</p>
            </div>
            <div className="steps-list">
              {recipe.steps.map((step, index) => (
                <article
                  key={index}
                  className={`step ${activeStep === index ? "active" : ""} ${checkedSteps.includes(index) ? "completed" : ""}`}
                >
                  <button
                    className="step-number"
                    onClick={() => setActiveStep(index)}
                    aria-label={`${index + 1}단계 보기`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                  <div className="step-body">
                    <div className="step-title-line">
                      <h3>{step.title}</h3>
                      {step.minutes && (
                        <span>
                          <Icon name="clock" size={15} /> 약 {step.minutes}분
                        </span>
                      )}
                    </div>
                    {step.image && (
                      <img
                        className="step-photo"
                        src={step.image}
                        alt={`${index + 1}단계: ${step.title}`}
                        loading="lazy"
                      />
                    )}
                    <p>{step.body}</p>
                    <div className="step-actions">
                      <button
                        className="step-check"
                        onClick={() => toggleStep(index)}
                      >
                        <Icon name="check" size={15} />{" "}
                        {checkedSteps.includes(index)
                          ? "완료했어요"
                          : "이 단계 완료"}
                      </button>
                      {step.minutes && (
                        <button
                          onClick={() => {
                            setRemaining(step.minutes! * 60);
                            setDeadline(Date.now() + step.minutes! * 60_000);
                            setRunning(true);
                            setActiveStep(index);
                          }}
                        >
                          <Icon name="clock" size={15} /> {step.minutes}분
                          타이머
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {remaining !== null && (
              <div className="timer-bar" role="status">
                <Icon name="clock" size={20} />
                <span>
                  베이킹 타이머 <strong>{timeText}</strong>
                  {remaining === 0 ? " 완료!" : ""}
                </span>
                <button
                  onClick={() => {
                    if (running) {
                      setRunning(false);
                      setDeadline(null);
                    } else if (remaining && remaining > 0) {
                      setDeadline(Date.now() + remaining * 1000);
                      setRunning(true);
                    }
                  }}
                  aria-label={running ? "타이머 일시정지" : "타이머 시작"}
                >
                  <Icon name={running ? "pause" : "play"} size={18} />
                </button>
                <button
                  onClick={() => {
                    setRemaining(null);
                    setRunning(false);
                    setDeadline(null);
                  }}
                  aria-label="타이머 닫기"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            )}
          </section>
        </div>
        <div className="detail-end">
          <span>✳</span>
          <p>당신의 오븐에서도 맛있는 이야기가 시작되길.</p>
          <a className="text-link" href="#/community">
            커뮤니티에서 이야기 나누기 <Icon name="arrow" size={17} />
          </a>
        </div>
      </div>
      <div className="mobile-step-bar">
        <span>
          진행 {checkedSteps.length}/{recipe.steps.length}단계
        </span>
        <button
          onClick={() => {
            const next = Math.min(activeStep + 1, recipe.steps.length - 1);
            setActiveStep(next);
            document
              .querySelectorAll(".step")
              [next]?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          다음 단계 <Icon name="arrow" size={16} />
        </button>
      </div>
      {cookingMode && (
        <div className="cooking-controls" aria-label="조리 모드 단계 이동">
          <button
            type="button"
            onClick={() => {
              const next = Math.max(0, activeStep - 1);
              setActiveStep(next);
              document
                .querySelectorAll(".step")
                [next]?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            이전 단계
          </button>
          <span>
            {activeStep + 1} / {recipe.steps.length}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(recipe.steps.length - 1, activeStep + 1);
              setActiveStep(next);
              document
                .querySelectorAll(".step")
                [next]?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            다음 단계
          </button>
        </div>
      )}
    </main>
  );
}
