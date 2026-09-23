import type { Recipe } from "../shared/types";
import { Icon } from "../shared/Icon";

export function RecipeCard({
  recipe,
  saved,
  onToggleSave,
}: {
  recipe: Recipe;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  return (
    <article className="recipe-card">
      <a
        className="recipe-card-image"
        href={`#/recipes/${recipe.id}`}
        aria-label={`${recipe.title} 레시피 보기`}
      >
        <img src={recipe.image} alt={recipe.title} loading="lazy" />
        <span className="category-badge">{recipe.category}</span>
      </a>
      <button
        className={`save-button ${saved ? "saved" : ""}`}
        type="button"
        onClick={() => onToggleSave(recipe.id)}
        aria-label={
          saved ? `${recipe.title} 스크랩 해제` : `${recipe.title} 스크랩`
        }
        aria-pressed={saved}
      >
        <Icon name="heart" size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="recipe-card-copy">
        <p className="eyebrow">{recipe.englishTitle}</p>
        <a href={`#/recipes/${recipe.id}`}>
          <h3>{recipe.title}</h3>
        </a>
        <p className="recipe-card-description">{recipe.description}</p>
        <div className="recipe-card-meta">
          <span>
            <Icon name="clock" size={15} /> {recipe.minutes}분
          </span>
          <span className="meta-divider" />
          <span>{recipe.difficulty}</span>
          <span className="meta-author">by {recipe.author}</span>
        </div>
      </div>
    </article>
  );
}
