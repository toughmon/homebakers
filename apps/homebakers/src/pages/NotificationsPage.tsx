import { AchievementBadge } from "../components/AchievementBadge";
import { useState } from "react";
import { errorMessage } from "../shared/api";
import type { Notification } from "../shared/types";

export function NotificationsPage({
  notifications,
  onRead,
}: {
  notifications: Notification[];
  onRead: (id: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <main className="page-main container notifications-page">
      <div className="page-heading">
        <p className="eyebrow accent">FROM YOUR BAKERS</p>
        <h1>나의 알림</h1>
        <p>새 레시피 소식과 새로 획득한 배지를 확인하세요.</p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!notifications.length && (
        <div className="empty-state">
          <h2>아직 알림이 없어요</h2>
          <p>마음에 드는 레시피의 작성자를 팔로우해보세요.</p>
        </div>
      )}
      <div className="notification-list">
        {notifications.map((item) => (
          <a
            key={item.id}
            className={`notification-item ${item.readAt ? "" : "unread"}`}
            href={
              item.kind === "badge_earned"
                ? "#/growth"
                : `#/recipes/${item.recipeId}`
            }
            onClick={() => {
              if (!item.readAt)
                void onRead(item.id).catch((error) =>
                  setError(errorMessage(error)),
                );
            }}
          >
            {item.kind === "badge_earned" ? (
              <>
                <AchievementBadge id={item.badgeId!} earned decorative />
                <strong>새 배지를 획득했어요!</strong>
                <span>{item.badgeName} · 배지 컬렉션에서 확인하기</span>
              </>
            ) : (
              <>
                <strong>{item.actorName} 님이 새 레시피를 올렸어요</strong>
                <span>{item.recipeTitle}</span>
              </>
            )}
            <time>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</time>
          </a>
        ))}
      </div>
    </main>
  );
}
