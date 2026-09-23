import { RecipeCard } from "../components/RecipeCard";
import { Icon } from "../shared/Icon";
import type { Recipe } from "../shared/types";

export function SavedPage({
  recipes,
  savedIds,
  onToggleSave,
}: {
  recipes: Recipe[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
}) {
  const saved = recipes.filter((recipe) => savedIds.includes(recipe.id));
  return (
    <main className="page-main container">
      <div className="page-heading">
        <p className="eyebrow accent">YOUR COLLECTION</p>
        <h1>나만의 레시피 서랍</h1>
        <p>언젠가 굽고 싶은 레시피를 차곡차곡 모아두세요.</p>
      </div>
      {saved.length ? (
        <div className="recipe-grid explore-grid">
          {saved.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              saved
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="bookmark" size={36} />
          <h2>아직 담아둔 레시피가 없어요</h2>
          <p>마음에 드는 레시피의 하트를 눌러 저장해보세요.</p>
          <a className="button button-dark" href="#/recipes">
            레시피 둘러보기 <Icon name="arrow" size={16} />
          </a>
        </div>
      )}
    </main>
  );
}
