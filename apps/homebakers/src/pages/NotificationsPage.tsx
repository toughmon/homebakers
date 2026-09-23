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
        <h1>새 레시피 알림</h1>
        <p>팔로우한 베이커가 새 레시피를 올리면 이곳에 표시됩니다.</p>
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
            href={`#/recipes/${item.recipeId}`}
            onClick={() => {
              if (!item.readAt)
                void onRead(item.id).catch((error) =>
                  setError(errorMessage(error)),
                );
            }}
          >
            <strong>{item.actorName} 님이 새 레시피를 올렸어요</strong>
            <span>{item.recipeTitle}</span>
            <time>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</time>
          </a>
        ))}
      </div>
    </main>
  );
}
