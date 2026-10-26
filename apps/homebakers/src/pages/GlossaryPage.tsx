import { useMemo, useState } from "react";
import {
  glossary,
  glossaryCategories,
  type GlossaryTerm,
} from "../data/glossary";
import { Icon } from "../shared/Icon";

const sortedGlossary = [...glossary].sort((a, b) =>
  a.term.localeCompare(b.term, "ko"),
);

const normalize = (value: string) =>
  value.toLowerCase().replace(/[\s·\-_'’]/g, "");

const searchText = (item: GlossaryTerm) =>
  normalize(
    [item.term, item.english, item.meaning, item.tip, ...(item.aliases ?? [])]
      .filter(Boolean)
      .join(" "),
  );

const indexed = sortedGlossary.map((item) => ({
  item,
  text: searchText(item),
  names: normalize(
    [item.term, item.english, ...(item.aliases ?? [])]
      .filter(Boolean)
      .join(" "),
  ),
}));

export function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof glossaryCategories)[number]>("전체");
  const filtered = useMemo(() => {
    const keyword = normalize(query.trim());
    const result = indexed.filter(
      (entry) =>
        (category === "전체" || entry.item.category === category) &&
        (!keyword || entry.text.includes(keyword)),
    );
    if (!keyword) return result.map((entry) => entry.item);
    // 용어·영문명·별칭에 걸린 항목을 설명에만 걸린 항목보다 앞에 둡니다.
    return [
      ...result.filter((entry) => entry.names.includes(keyword)),
      ...result.filter((entry) => !entry.names.includes(keyword)),
    ].map((entry) => entry.item);
  }, [query, category]);

  return (
    <main className="page-main container glossary-page">
      <div className="page-heading">
        <p className="eyebrow accent">BAKING GLOSSARY</p>
        <h1>베이킹 용어 사전</h1>
        <p>
          레시피에서 만난 낯선 단어를 한 번에 찾아보세요. 영어, 줄임말, 비슷한
          표현으로도 검색할 수 있어요.
        </p>
      </div>
      <label className="search-field glossary-search">
        <Icon name="search" size={20} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="용어·영어 검색 (예: 오토리즈)"
          aria-label="베이킹 용어 검색"
        />
      </label>
      <div className="category-tabs" role="group" aria-label="용어 종류">
        {glossaryCategories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="results-line">
        <span>
          총 <strong>{filtered.length}</strong>개의 용어
        </span>
        <span>KNOW YOUR TERMS</span>
      </div>
      {filtered.length ? (
        <ul className="glossary-list">
          {filtered.map((item) => (
            <li key={item.term} className="glossary-item">
              <div className="glossary-head">
                <h2>{item.term}</h2>
                {item.english && <em>{item.english}</em>}
                <span className="glossary-tag">{item.category}</span>
              </div>
              <p>{item.meaning}</p>
              {item.tip && (
                <p className="glossary-tip">
                  <strong>TIP</strong> {item.tip}
                </p>
              )}
              {!!item.aliases?.length && (
                <p className="glossary-aliases">
                  비슷한 표현 · {item.aliases.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <Icon name="search" size={34} />
          <h2>일치하는 용어가 없어요</h2>
          <p>철자를 확인하거나 다른 표현으로 검색해 보세요.</p>
          <button
            className="button button-outline"
            onClick={() => {
              setQuery("");
              setCategory("전체");
            }}
          >
            검색 초기화
          </button>
        </div>
      )}
    </main>
  );
}
