import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createDatabasePool } from "../database.js";
import { recipes, initialPosts } from "../../../homebakers/src/data/recipes.js";
config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });
const pool = await createDatabasePool(
  fileURLToPath(new URL("../../../../", import.meta.url)),
);
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const user = await client.query(
    "INSERT INTO baker_users(email,name) VALUES('editor@oven-salon.invalid','오븐 살롱') ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id",
  );
  for (const recipe of recipes)
    await client.query(
      "INSERT INTO baker_recipes(id,user_id,title,description,image,category,difficulty,minutes,servings,ingredients,steps) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING",
      [
        recipe.id,
        user.rows[0].id,
        recipe.title,
        recipe.description,
        recipe.image,
        recipe.category,
        recipe.difficulty,
        recipe.minutes,
        recipe.servings,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.steps),
      ],
    );
  for (const [index, post] of initialPosts.entries())
    await client.query(
      "INSERT INTO baker_posts(id,user_id,category,title,body,recipe_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING",
      [
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        user.rows[0].id,
        post.category,
        post.title,
        post.body,
        post.recipeId ?? null,
      ],
    );
  await client.query("COMMIT");
  console.log("Homebakers sample content is ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
