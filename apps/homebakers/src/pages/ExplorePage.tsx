import { useMemo, useState } from "react";
import { RecipeCard } from "../components/RecipeCard";
import { Icon } from "../shared/Icon";
import type { Recipe } from "../shared/types";

const categories = ["전체", "케이크", "구움과자", "빵", "타르트", "기타"];

export function ExplorePage({
  recipes,
  savedIds,
  onToggleSave,
}: {
  recipes: Recipe[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [difficulty, setDifficulty] = useState("전체 난이도");
  const [sort, setSort] = useState("추천순");
  const filtered = useMemo(() => {
    const result = recipes.filter(
      (recipe) =>
        (category === "전체" || recipe.category === category) &&
        (difficulty === "전체 난이도" || recipe.difficulty === difficulty) &&
        `${recipe.title} ${recipe.description} ${recipe.author} ${recipe.category} ${recipe.ingredients.map((item) => item.name).join(" ")}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );
    if (sort === "짧은 시간순")
      return [...result].sort((a, b) => a.minutes - b.minutes);
    if (sort === "인기순") return [...result].sort((a, b) => b.likes - a.likes);
    return result;
  }, [recipes, category, difficulty, query, sort]);

  return (
    <main className="page-main container">
      <div className="page-heading">
        <p className="eyebrow accent">FIND YOUR NEXT BAKE</p>
        <h1>레시피를 발견하는 시간</h1>
        <p>나의 취향과 오늘의 기분에 맞는 레시피를 찾아보세요.</p>
      </div>
      <div className="explore-toolbar">
        <label className="search-field">
          <Icon name="search" size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="레시피, 재료, 베이커 검색"
            aria-label="레시피 검색"
          />
        </label>
        <div className="selects">
          <label className="select-field">
            <span className="sr-only">난이도</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option>전체 난이도</option>
              <option>쉬움</option>
              <option>보통</option>
              <option>도전</option>
            </select>
            <Icon name="chevron" size={16} />
          </label>
          <label className="select-field">
            <span className="sr-only">정렬</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option>추천순</option>
              <option>인기순</option>
              <option>짧은 시간순</option>
            </select>
            <Icon name="chevron" size={16} />
          </label>
        </div>
      </div>
      <div className="category-tabs" role="group" aria-label="레시피 종류">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="results-line">
        <span>
          총 <strong>{filtered.length}</strong>개의 레시피
        </span>
        <span>GOOD BAKING STARTS HERE</span>
      </div>
      {filtered.length ? (
        <div className="recipe-grid explore-grid">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              saved={savedIds.includes(recipe.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="search" size={34} />
          <h2>일치하는 레시피가 없어요</h2>
          <p>검색어나 필터를 바꿔 다시 찾아보세요.</p>
          <button
            className="button button-outline"
            onClick={() => {
              setQuery("");
              setCategory("전체");
              setDifficulty("전체 난이도");
            }}
          >
            필터 초기화
          </button>
        </div>
      )}
    </main>
  );
}
