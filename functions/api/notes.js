import { neon } from "@neondatabase/serverless";
import { errorResponse, json, requireUser } from "../_lib/auth.js";

function getDatabase(env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(env.DATABASE_URL);
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;

  try {
    const sql = getDatabase(env);
    const notes = await sql`
      SELECT id, title, content, created_at, updated_at
      FROM notes
      WHERE owner_sub = ${auth.user.sub}
      ORDER BY updated_at DESC
    `;
    return json({ notes });
  } catch (error) {
    console.error("List notes failed:", error);
    return errorResponse("Could not load notes. Check the database configuration and migration.", 500);
  }
}

export async function onRequestPost({ request, env }) {
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
      INSERT INTO notes (owner_sub, title, content)
      VALUES (${auth.user.sub}, ${title}, ${content})
      RETURNING id, title, content, created_at, updated_at
    `;
    return json({ note }, 201);
  } catch (error) {
    console.error("Create note failed:", error);
    return errorResponse("Could not save the note. Check the database configuration and migration.", 500);
  }
}
