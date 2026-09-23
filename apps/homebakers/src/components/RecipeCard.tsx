import type { Recipe } from "../shared/types";
import { Icon } from "../shared/Icon";

export function RecipeCard({
  recipe,
  saved,
  onToggleSave,
  liked,
  onToggleLike,
}: {
  recipe: Recipe;
  saved: boolean;
  onToggleSave: (id: string) => void;
  liked?: boolean;
  onToggleLike?: (id: string) => void;
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
        <Icon
          name="bookmark"
          size={18}
          fill={saved ? "currentColor" : "none"}
        />
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
        {onToggleLike && (
          <button
            className="card-like"
            type="button"
            aria-pressed={Boolean(liked)}
            onClick={() => onToggleLike(recipe.id)}
          >
            <Icon
              name="heart"
              size={15}
              fill={liked ? "currentColor" : "none"}
            />{" "}
            좋아요 {recipe.likes}
          </button>
        )}
      </div>
    </article>
  );
}
