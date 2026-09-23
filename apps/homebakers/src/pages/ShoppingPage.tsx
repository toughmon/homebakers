import { useEffect, useState } from "react";
import { api, errorMessage } from "../shared/api";
import type { ShoppingItem } from "../shared/types";

export function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void api
      .shoppingList()
      .then(setItems)
      .catch((error) => setError(errorMessage(error)));
  }, []);
  const groups = Array.from(
    new Map(items.map((item) => [item.recipeId, item.recipeTitle])).entries(),
  );
  return (
    <main className="page-main container shopping-page">
      <div className="page-heading">
        <p className="eyebrow accent">BAKING PREP</p>
        <h1>장보기 목록</h1>
        <p>레시피에서 담은 재료를 준비하며 체크해보세요.</p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!items.length && (
        <div className="empty-state">
          <h2>아직 담은 재료가 없어요</h2>
          <a className="button button-dark" href="#/recipes">
            레시피 둘러보기
          </a>
        </div>
      )}
      {groups.map(([recipeId, title]) => (
        <section className="shopping-group" key={recipeId ?? "deleted"}>
          <h2>{title || "삭제된 레시피"}</h2>
          <ul>
            {items
              .filter((item) => item.recipeId === recipeId)
              .map((item) => (
                <li key={item.id}>
                  <label className={item.checked ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={async () => {
                        try {
                          await api.checkShoppingItem(item.id, !item.checked);
                          setItems((items) =>
                            items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, checked: !entry.checked }
                                : entry,
                            ),
                          );
                        } catch (error) {
                          setError(errorMessage(error));
                        }
                      }}
                    />{" "}
                    {item.name}{" "}
                    <strong>
                      {Number.isInteger(item.amount)
                        ? item.amount
                        : Number(item.amount.toFixed(1))}
                      {item.unit}
                    </strong>
                  </label>
                  <button
                    type="button"
                    aria-label={`${item.name} 삭제`}
                    onClick={async () => {
                      try {
                        await api.deleteShoppingItem(item.id);
                        setItems((items) =>
                          items.filter((entry) => entry.id !== item.id),
                        );
                      } catch (error) {
                        setError(errorMessage(error));
                      }
                    }}
                  >
                    삭제
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
