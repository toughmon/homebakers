import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { Type, type Static } from "@sinclair/typebox";

const idParams = Type.Object({ id: Type.String({ format: "uuid" }) });
const image = Type.Optional(
  Type.String({
    maxLength: 500,
    pattern: "^/(images|api/uploads)/[a-zA-Z0-9._-]+$",
  }),
);
const journalBody = Type.Object(
  {
    recipeId: Type.String({ minLength: 1, maxLength: 100 }),
    bakedOn: Type.String({ format: "date" }),
    body: Type.String({ minLength: 1, maxLength: 2000, pattern: "\\S" }),
    changes: Type.String({ maxLength: 2000 }),
    outcome: Type.Union([
      Type.Literal("성공"),
      Type.Literal("아쉬움"),
      Type.Literal("다시 도전"),
    ]),
    image,
  },
  { additionalProperties: false },
);

const bakeSources = `SELECT recipe_key,category,min(created_at) AS created_at FROM (
 SELECT recipe_key,category,created_at FROM baker_journal WHERE user_id=$1 AND image IS NOT NULL
 UNION ALL SELECT v.recipe_id,r.category,v.created_at FROM baker_bake_reviews v JOIN baker_recipes r ON r.id=v.recipe_id WHERE v.user_id=$1 AND v.image IS NOT NULL
) b GROUP BY recipe_key,category`;
const sources = `WITH bakes AS (${bakeSources}), votes AS (
 SELECT v.comment_id,v.user_id,row_number() OVER(PARTITION BY v.comment_id ORDER BY v.created_at,v.user_id) AS position
 FROM baker_helpful_votes v JOIN baker_comments c ON c.id=v.comment_id WHERE c.user_id=$1 AND v.user_id<>c.user_id
), sources AS (
 SELECT DISTINCT 'bake:'||recipe_key AS event_key,15 AS points,'사진 베이킹 기록' AS reason FROM bakes
 UNION ALL SELECT 'challenge:'||e.challenge_id,30,'주간 도전 완료' FROM baker_challenge_entries e JOIN baker_journal j ON j.id=e.journal_id JOIN baker_weekly_challenges w ON w.id=e.challenge_id WHERE e.user_id=$1 AND j.user_id=$1 AND j.image IS NOT NULL AND j.category=w.category AND j.baked_on>=w.week_start AND j.baked_on<w.week_end
 UNION ALL SELECT 'helpful:'||comment_id||':'||user_id,2,'도움 됐어요 평가' FROM votes WHERE position<=10
 UNION ALL SELECT 'accepted:'||a.post_id,25,'질문 답변 채택' FROM baker_accepted_answers a JOIN baker_comments c ON c.id=a.comment_id JOIN baker_posts p ON p.id=a.post_id WHERE c.user_id=$1 AND c.post_id=p.id AND p.category='질문' AND p.user_id<>c.user_id
)`;
export async function syncExperience(pool: Pool, userId: string) {
  await pool.query(
    `${sources}, awarded AS (
    INSERT INTO baker_xp_ledger(user_id,event_key,points,reason,active)
    SELECT $1,event_key,points,reason,true FROM sources
    ON CONFLICT(user_id,event_key) DO UPDATE SET active=true,points=EXCLUDED.points,reason=EXCLUDED.reason RETURNING event_key
  ) UPDATE baker_xp_ledger SET active=false WHERE user_id=$1 AND event_key NOT IN(SELECT event_key FROM sources)`,
    [userId],
  );
}
export function koreaToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function weeklyTheme(now = new Date()) {
  const local = new Date(`${koreaToday(now)}T00:00:00Z`);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  const start = local.toISOString().slice(0, 10);
  const category = ["구움과자", "빵", "케이크", "타르트", "기타"][
    Math.floor(local.getTime() / (7 * 86400000)) % 5
  ]!;
  local.setUTCDate(local.getUTCDate() + 7);
  return { start, end: local.toISOString().slice(0, 10), category };
}

export async function getGrowth(pool: Pool, userId: string) {
  await syncExperience(pool, userId);
  const history = (
    await pool.query(
      'SELECT event_key AS "eventKey",points,reason,active,created_at AS "createdAt" FROM baker_xp_ledger WHERE user_id=$1 ORDER BY created_at DESC,event_key',
      [userId],
    )
  ).rows;
  const xp = history
    .filter((x) => x.active)
    .reduce((sum, x) => sum + Number(x.points), 0);
  const bakes = (await pool.query(bakeSources, [userId])).rows;
  const categories = new Set(bakes.map((x) => x.category));
  const levels = [
    { name: "첫 반죽", minimum: 0 },
    { name: "홈베이커", minimum: 30 },
    { name: "숙련 베이커", minimum: 100 },
    { name: "오븐 장인", minimum: 250 },
    { name: "베이킹 멘토", minimum: 500 },
  ];
  const levelIndex = levels.filter((x) => xp >= x.minimum).length - 1;
  const badges = [
    {
      id: "first-bake",
      name: "첫 완성 사진",
      description: "사진이 있는 베이킹 기록 1개",
      earned: bakes.length > 0,
      current: Math.min(1, bakes.length),
      target: 1,
    },
    {
      id: "five-bakes",
      name: "다섯 가지 오븐",
      description: "서로 다른 레시피 5개를 사진으로 기록",
      earned: new Set(bakes.map((x) => x.recipe_key)).size >= 5,
      current: Math.min(5, new Set(bakes.map((x) => x.recipe_key)).size),
      target: 5,
    },
    {
      id: "three-categories",
      name: "베이킹 탐험가",
      description: "빵·구움과자·케이크를 모두 사진으로 기록",
      earned: ["빵", "구움과자", "케이크"].every((x) => categories.has(x)),
      current: ["빵", "구움과자", "케이크"].filter((x) => categories.has(x))
        .length,
      target: 3,
      remaining: ["빵", "구움과자", "케이크"].filter((x) => !categories.has(x)),
    },
    {
      id: "weekly",
      name: "함께 굽는 베이커",
      description: "주간 도전 1회 완료",
      earned: history.some(
        (x) => x.active && x.eventKey.startsWith("challenge:"),
      ),
    },
    {
      id: "helpful",
      name: "다정한 조언",
      description: "다른 사람의 도움 됐어요 평가 받기",
      earned: history.some(
        (x) => x.active && x.eventKey.startsWith("helpful:"),
      ),
    },
    {
      id: "answer",
      name: "문제 해결사",
      description: "질문 답변으로 채택되기",
      earned: history.some(
        (x) => x.active && x.eventKey.startsWith("accepted:"),
      ),
    },
  ];
  for (const badge of badges) {
    if (badge.earned)
      await pool.query(
        `WITH award AS (
          INSERT INTO baker_badge_awards(user_id,badge_id) VALUES($1,$2)
          ON CONFLICT DO NOTHING RETURNING user_id,badge_id
        ) INSERT INTO baker_notifications(user_id,actor_id,kind,badge_id,badge_name)
          SELECT user_id,user_id,'badge_earned',badge_id,$3 FROM award`,
        [userId, badge.id, badge.name],
      );
  }
  const awards = (
    await pool.query(
      "SELECT badge_id,earned_at FROM baker_badge_awards WHERE user_id=$1",
      [userId],
    )
  ).rows;
  await pool.query(
    "UPDATE baker_users SET featured_badge=NULL WHERE id=$1 AND featured_badge IS NOT NULL AND NOT(featured_badge=ANY($2::text[]))",
    [userId, badges.filter((b) => b.earned).map((b) => b.id)],
  );
  const featuredBadge =
    (
      await pool.query("SELECT featured_badge FROM baker_users WHERE id=$1", [
        userId,
      ])
    ).rows[0]?.featured_badge ?? null;
  return {
    xp,
    level: levelIndex + 1,
    levelName: levels[levelIndex]!.name,
    levelMinimum: levels[levelIndex]!.minimum,
    nextLevel: levels[levelIndex + 1] ?? null,
    bakeCount: new Set(bakes.map((x) => x.recipe_key)).size,
    featuredBadge,
    badges: badges.map((b) => ({
      ...b,
      current: "current" in b ? b.current : Number(b.earned),
      target: "target" in b ? b.target : 1,
      earnedAt: awards.find((a) => a.badge_id === b.id)?.earned_at ?? null,
    })),
    history,
  };
}

export function registerGrowth(
  api: FastifyInstance,
  pool: Pool,
  requireUser: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
) {
  const journalSelect = `SELECT id,recipe_id AS "recipeId",recipe_title AS "recipeTitle",category,baked_on::text AS "bakedOn",body,changes,outcome,image,created_at AS "createdAt" FROM baker_journal`;
  api.get("/api/growth", { preHandler: requireUser }, async (request) => {
    return getGrowth(pool, request.baker!.id);
  });
  api.put<{ Body: { badgeId: string | null } }>(
    "/api/growth/featured-badge",
    {
      preHandler: requireUser,
      schema: {
        body: Type.Object(
          {
            badgeId: Type.Union([Type.String({ maxLength: 60 }), Type.Null()]),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const growth = await getGrowth(pool, request.baker!.id);
      const id = request.body.badgeId;
      if (id !== null && !growth.badges.some((b) => b.id === id && b.earned))
        return reply
          .code(400)
          .send({ message: "획득한 배지만 대표 배지로 선택할 수 있습니다." });
      await pool.query("UPDATE baker_users SET featured_badge=$2 WHERE id=$1", [
        request.baker!.id,
        id,
      ]);
      return { featuredBadge: id };
    },
  );
  api.get(
    "/api/baking-journal",
    { preHandler: requireUser },
    async (request) =>
      (
        await pool.query(
          `${journalSelect} WHERE user_id=$1 ORDER BY baked_on DESC,created_at DESC`,
          [request.baker!.id],
        )
      ).rows,
  );
  for (const method of ["POST", "PUT"] as const)
    api.route<{ Params: { id: string }; Body: Static<typeof journalBody> }>({
      method,
      url:
        method === "POST" ? "/api/baking-journal" : "/api/baking-journal/:id",
      preHandler: requireUser,
      schema: {
        body: journalBody,
        ...(method === "PUT" ? { params: idParams } : {}),
      },
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
      handler: async (request, reply) => {
        const b = request.body;
        if (b.bakedOn > koreaToday())
          return reply
            .code(400)
            .send({ message: "미래 날짜로 베이킹 기록을 남길 수 없습니다." });
        const recipe = (
          await pool.query(
            "SELECT id,title,category FROM baker_recipes WHERE id=$1",
            [b.recipeId],
          )
        ).rows[0];
        if (!recipe)
          return reply
            .code(404)
            .send({ message: "레시피를 찾을 수 없습니다." });
        const values = [
          request.baker!.id,
          recipe.id,
          recipe.title,
          recipe.category,
          b.bakedOn,
          b.body.trim(),
          b.changes.trim(),
          b.outcome,
          b.image ?? null,
        ];
        const saved =
          method === "POST"
            ? await pool.query(
                "INSERT INTO baker_journal(user_id,recipe_id,recipe_key,recipe_title,category,baked_on,body,changes,outcome,image) VALUES($1,$2,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
                values,
              )
            : await pool.query(
                "UPDATE baker_journal SET recipe_id=$2,recipe_key=$2,recipe_title=$3,category=$4,baked_on=$5,body=$6,changes=$7,outcome=$8,image=$9 WHERE id=$10 AND user_id=$1 RETURNING id",
                [...values, request.params.id],
              );
        if (!saved.rows.length)
          return reply
            .code(404)
            .send({ message: "수정할 기록을 찾을 수 없습니다." });
        await syncExperience(pool, request.baker!.id);
        return reply
          .code(method === "POST" ? 201 : 200)
          .send(
            (
              await pool.query(`${journalSelect} WHERE id=$1`, [
                saved.rows[0].id,
              ])
            ).rows[0],
          );
      },
    });
  api.delete<{ Params: { id: string } }>(
    "/api/baking-journal/:id",
    { preHandler: requireUser, schema: { params: idParams } },
    async (request, reply) => {
      const deleted = await pool.query(
        "DELETE FROM baker_journal WHERE id=$1 AND user_id=$2",
        [request.params.id, request.baker!.id],
      );
      if (!deleted.rowCount)
        return reply
          .code(404)
          .send({ message: "삭제할 기록을 찾을 수 없습니다." });
      await syncExperience(pool, request.baker!.id);
      return { success: true };
    },
  );
  api.get("/api/challenges/current", async (request) => {
    const week = weeklyTheme();
    const challenge = (
      await pool.query(
        'INSERT INTO baker_weekly_challenges(week_start,week_end,category,title,description) VALUES($1,$2,$3,$4,$5) ON CONFLICT(week_start) DO UPDATE SET week_start=EXCLUDED.week_start RETURNING id,week_start::text AS "weekStart",week_end::text AS "weekEnd",category,title,description',
        [
          week.start,
          week.end,
          week.category,
          `이번 주 ${week.category} 함께 굽기`,
          `${week.category} 레시피에 도전하고 완성 사진과 배운 점을 나눠주세요. 결과가 아쉬워도 참여할 수 있어요.`,
        ],
      )
    ).rows[0]!;
    const participants = (
      await pool.query(
        'SELECT u.name,j.image,j.body,j.recipe_title AS "recipeTitle" FROM baker_challenge_entries e JOIN baker_users u ON u.id=e.user_id JOIN baker_journal j ON j.id=e.journal_id WHERE e.challenge_id=$1 AND j.image IS NOT NULL AND j.category=$2 AND j.baked_on>=$3 AND j.baked_on<$4 ORDER BY e.joined_at DESC',
        [challenge.id, week.category, week.start, week.end],
      )
    ).rows;
    const entry = request.baker
      ? (
          await pool.query(
            'SELECT journal_id AS "journalId" FROM baker_challenge_entries WHERE challenge_id=$1 AND user_id=$2',
            [challenge.id, request.baker.id],
          )
        ).rows[0]
      : undefined;
    return {
      ...challenge,
      participants,
      joined: Boolean(entry),
      journalId: entry?.journalId ?? null,
    };
  });
  const openChallenge = async (id: string) =>
    (
      await pool.query(
        "SELECT * FROM baker_weekly_challenges WHERE id=$1 AND week_start<=$2::date AND week_end>$2::date",
        [id, koreaToday()],
      )
    ).rows[0];
  api.post<{ Params: { id: string } }>(
    "/api/challenges/:id/join",
    { preHandler: requireUser, schema: { params: idParams } },
    async (request, reply) => {
      if (!(await openChallenge(request.params.id)))
        return reply
          .code(409)
          .send({ message: "현재 진행 중인 도전이 아닙니다." });
      await pool.query(
        "INSERT INTO baker_challenge_entries(challenge_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [request.params.id, request.baker!.id],
      );
      return { success: true };
    },
  );
  api.post<{ Params: { id: string }; Body: { journalId: string } }>(
    "/api/challenges/:id/submit",
    {
      preHandler: requireUser,
      schema: {
        params: idParams,
        body: Type.Object(
          { journalId: Type.String({ format: "uuid" }) },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const challenge = await openChallenge(request.params.id);
      if (!challenge)
        return reply
          .code(409)
          .send({ message: "현재 진행 중인 도전이 아닙니다." });
      const journal = (
        await pool.query(
          "SELECT id FROM baker_journal WHERE id=$1 AND user_id=$2 AND image IS NOT NULL AND category=$3 AND baked_on>=$4 AND baked_on<$5",
          [
            request.body.journalId,
            request.baker!.id,
            challenge.category,
            challenge.week_start,
            challenge.week_end,
          ],
        )
      ).rows[0];
      if (!journal)
        return reply.code(400).send({
          message: "이번 주 주제에 맞는 내 사진 기록을 선택해주세요.",
        });
      const result = await pool.query(
        "UPDATE baker_challenge_entries SET journal_id=$1 WHERE challenge_id=$2 AND user_id=$3",
        [journal.id, request.params.id, request.baker!.id],
      );
      if (!result.rowCount)
        return reply.code(409).send({ message: "먼저 도전에 참여해주세요." });
      await syncExperience(pool, request.baker!.id);
      return { success: true };
    },
  );
  for (const method of ["PUT", "DELETE"] as const)
    api.route<{ Params: { id: string } }>({
      method,
      url: "/api/comments/:id/helpful",
      preHandler: requireUser,
      schema: { params: idParams },
      handler: async (request, reply) => {
        const comment = (
          await pool.query("SELECT user_id FROM baker_comments WHERE id=$1", [
            request.params.id,
          ])
        ).rows[0];
        if (!comment)
          return reply.code(404).send({ message: "댓글을 찾을 수 없습니다." });
        if (comment.user_id === request.baker!.id)
          return reply
            .code(400)
            .send({ message: "내 댓글에는 도움 됐어요를 누를 수 없습니다." });
        await pool.query(
          method === "PUT"
            ? "INSERT INTO baker_helpful_votes(comment_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING"
            : "DELETE FROM baker_helpful_votes WHERE comment_id=$1 AND user_id=$2",
          [request.params.id, request.baker!.id],
        );
        await syncExperience(pool, comment.user_id);
        return { success: true };
      },
    });
  for (const method of ["PUT", "DELETE"] as const)
    api.route<{ Params: { id: string }; Body: { commentId: string } }>({
      method,
      url: "/api/posts/:id/accepted-answer",
      preHandler: requireUser,
      schema: {
        params: idParams,
        ...(method === "PUT"
          ? {
              body: Type.Object(
                { commentId: Type.String({ format: "uuid" }) },
                { additionalProperties: false },
              ),
            }
          : {}),
      },
      handler: async (request, reply) => {
        const question = (
          await pool.query(
            "SELECT id FROM baker_posts WHERE id=$1 AND user_id=$2 AND category='질문'",
            [request.params.id, request.baker!.id],
          )
        ).rows[0];
        if (!question)
          return reply
            .code(403)
            .send({ message: "질문 작성자만 답변을 채택할 수 있습니다." });
        if (method === "PUT") {
          const answer = (
            await pool.query(
              "SELECT id FROM baker_comments WHERE id=$1 AND post_id=$2 AND user_id<>$3",
              [request.body.commentId, request.params.id, request.baker!.id],
            )
          ).rows[0];
          if (!answer)
            return reply.code(400).send({
              message: "이 질문에 달린 다른 사람의 답변을 선택해주세요.",
            });
          await pool.query(
            "INSERT INTO baker_accepted_answers(post_id,comment_id) VALUES($1,$2) ON CONFLICT(post_id) DO UPDATE SET comment_id=EXCLUDED.comment_id",
            [request.params.id, answer.id],
          );
        } else
          await pool.query(
            "DELETE FROM baker_accepted_answers WHERE post_id=$1",
            [request.params.id],
          );
        const authors = (
          await pool.query(
            "SELECT DISTINCT user_id FROM baker_comments WHERE post_id=$1",
            [request.params.id],
          )
        ).rows;
        for (const author of authors)
          await syncExperience(pool, author.user_id);
        return { success: true };
      },
    });
}
