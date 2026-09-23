import { RecipeCard } from "../components/RecipeCard";
import type { Post, Recipe } from "../shared/types";
import { Icon } from "../shared/Icon";

type Props = {
  recipes: Recipe[];
  posts: Post[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
};

export function HomePage({ recipes, posts, savedIds, onToggleSave }: Props) {
  const featured =
    recipes.find((recipe) => recipe.id === "strawberry-cake") ?? recipes[0];
  return (
    <main>
      <section className="hero container">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="tiny-line" /> THE ART OF HOME BAKING
          </p>
          <h1>
            굽는 시간,
            <br />
            <em>마음이 머무는 순간</em>
          </h1>
          <p className="hero-description">
            한 조각의 달콤함을 만드는 과정부터
            <br className="desktop-break" /> 완성의 기쁨까지, 함께 나눠요.
          </p>
          <a className="button button-dark hero-button" href="#/recipes">
            레시피 둘러보기 <Icon name="arrow" size={17} />
          </a>
        </div>
        <span className="hero-side-note">01 — A TABLE FOR EVERY BAKER</span>
      </section>

      <section className="intro-band">
        <div className="container intro-inner">
          <span className="intro-icon">✳</span>
          <p>좋은 레시피는 누군가의 하루를 조금 더 따뜻하게 만듭니다.</p>
          <span className="intro-english">
            MADE WITH CARE, SHARED WITH LOVE
          </span>
        </div>
      </section>

      <section className="section container featured-section">
        <div className="section-head">
          <div>
            <p className="eyebrow accent">CURATED FOR YOU</p>
            <h2>
              오늘의 추천 레시피<span className="heading-spark">✳</span>
            </h2>
            <p className="section-subtitle">오늘은 어떤 달콤함을 구워볼까요?</p>
          </div>
          <a className="text-link" href="#/recipes">
            모든 레시피 보기 <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="recipe-grid">
          {recipes.slice(0, 3).map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              saved={savedIds.includes(recipe.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      </section>

      {featured && (
        <section className="story-section">
          <div className="container story-layout">
            <div className="story-image">
              <img src={featured.image} alt={featured.title} loading="lazy" />
            </div>
            <div className="story-copy">
              <p className="eyebrow accent">BAKE WITH THE SEASON</p>
              <h2>
                계절을 담아,
                <br />
                <em>정성껏 한 조각</em>
              </h2>
              <p>{featured.description}</p>
              <a className="text-link" href={`#/recipes/${featured.id}`}>
                레시피 보기 <Icon name="arrow" size={18} />
              </a>
              <div className="story-number">01 / SEASONAL STORY</div>
            </div>
          </div>
        </section>
      )}

      <section className="section container community-section">
        <div className="section-head">
          <div>
            <p className="eyebrow accent">FROM OUR COMMUNITY</p>
            <h2>
              오븐 너머의 이야기<span className="heading-spark">✳</span>
            </h2>
            <p className="section-subtitle">
              서로의 굽는 시간을 나누는 따뜻한 공간
            </p>
          </div>
          <a className="text-link" href="#/community">
            커뮤니티 가기 <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="post-preview-grid">
          {posts.slice(0, 3).map((post, index) => (
            <a
              className="post-preview"
              key={post.id}
              href={`#/community/${post.id}`}
            >
              <span className="post-preview-number">0{index + 1}</span>
              <div>
                <span className="post-category">{post.category}</span>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <span className="post-preview-meta">
                  {post.author} · {post.date}
                </span>
              </div>
              <Icon name="arrow" size={21} />
            </a>
          ))}
        </div>
      </section>

      <section className="join-banner container">
        <div>
          <p className="eyebrow">YOUR STORY STARTS HERE</p>
          <h2>
            당신의 레시피도
            <br />
            누군가의 특별한 하루가 됩니다.
          </h2>
        </div>
        <a className="button button-light" href="#/write">
          레시피 나누기 <Icon name="arrow" size={17} />
        </a>
      </section>
    </main>
  );
}
