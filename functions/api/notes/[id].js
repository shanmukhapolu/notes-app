import { neon } from "@neondatabase/serverless";
import { errorResponse, json, requireUser } from "../../_lib/auth.js";

function getDatabase(env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(env.DATABASE_URL);
}

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (title.length > 160 || content.length > 50000) {
    return errorResponse("Title must be 160 characters or fewer and content must be 50,000 characters or fewer.");
  }

  try {
    const sql = getDatabase(env);
    const [note] = await sql`
      UPDATE notes
      SET title = ${title}, content = ${content}, updated_at = NOW()
      WHERE id = ${params.id}::uuid AND owner_sub = ${auth.user.sub}
      RETURNING id, title, content, created_at, updated_at
    `;
    if (!note) return errorResponse("Note not found.", 404);
    return json({ note });
  } catch (error) {
    console.error("Update note failed:", error);
    return errorResponse("Could not update the note.", 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;

  try {
    const sql = getDatabase(env);
    const [deleted] = await sql`
      DELETE FROM notes
      WHERE id = ${params.id}::uuid AND owner_sub = ${auth.user.sub}
      RETURNING id
    `;
    if (!deleted) return errorResponse("Note not found.", 404);
    return json({ success: true });
  } catch (error) {
    console.error("Delete note failed:", error);
    return errorResponse("Could not delete the note.", 500);
  }
}
