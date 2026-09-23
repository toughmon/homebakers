import { Icon } from "../shared/Icon";
import type { User } from "../shared/types";

type HeaderProps = { route: string; savedCount: number; user: User | null };

export function Header({ route, savedCount, user }: HeaderProps) {
  const links = [
    { href: "#/", label: "홈", id: "home", icon: "spark" as const },
    {
      href: "#/recipes",
      label: "레시피",
      id: "recipes",
      icon: "book" as const,
    },
    {
      href: "#/community",
      label: "커뮤니티",
      id: "community",
      icon: "users" as const,
    },
    {
      href: "#/saved",
      label: "스크랩",
      id: "saved",
      icon: "bookmark" as const,
    },
  ];

  return (
    <>
      <div className="announcement">
        GOOD THINGS TAKE TIME <span>✦</span> 오늘도 당신의 오븐에 작은 기쁨이
        머물길
      </div>
      <header className="site-header">
        <div className="header-inner container">
          <a className="brand" href="#/" aria-label="오븐 살롱 홈">
            <span className="brand-mark">✳</span>
            <span>
              OVEN <em>SALON</em>
              <small>THE ART OF HOME BAKING</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="주 메뉴">
            {links.slice(0, 3).map((link) => (
              <a
                key={link.id}
                className={
                  route === link.id ||
                  (route === "detail" && link.id === "recipes")
                    ? "active"
                    : ""
                }
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <a className="account-link" href={user ? "#/account" : "#/login"}>
              {user ? `${user.name} 님` : "로그인"}
            </a>
            <a
              className="icon-link saved-link"
              href="#/saved"
              aria-label={`스크랩한 레시피 ${savedCount}개`}
            >
              <Icon name="bookmark" size={21} />
              {savedCount > 0 && <span className="saved-dot" />}
            </a>
            <a className="button button-dark header-write" href="#/write">
              <Icon name="plus" size={16} /> 레시피 올리기
            </a>
          </div>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="모바일 메뉴">
        {links.map((link) => (
          <a
            key={link.id}
            className={
              route === link.id || (route === "detail" && link.id === "recipes")
                ? "active"
                : ""
            }
            href={link.href}
          >
            <Icon name={link.icon} size={21} />
            <span>{link.label}</span>
          </a>
        ))}
        <a className={route === "write" ? "active" : ""} href="#/write">
          <Icon name="pen" size={21} />
          <span>글쓰기</span>
        </a>
      </nav>
    </>
  );
}
