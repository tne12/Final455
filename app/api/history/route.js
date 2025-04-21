// app/api/history/route.js
import { NextResponse } from "next/server";
import {
  insertHistory,
  fetchHistory,
  deleteHistory,
  deleteAllHistory,
} from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");
  if (!userIdParam) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const userId = Number(userIdParam);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  try {
    const rows = await fetchHistory(userId);
    const payload = rows.map(r => ({
      id:         r.id.toString(),
      timestamp:  new Date(r.created_at.replace(" ", "T") + "Z").toISOString(),
      cipherType: r.cipher_type.charAt(0).toUpperCase() + r.cipher_type.slice(1),
      input:      r.plaintext,
      output:     r.encrypted_text,
      operation:  r.operation,
      key:        r.key_a != null ? `${r.key_a}, ${r.key_b}` : undefined,
    }));
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const {
      user_id,
      cipher_type,
      plaintext,
      encrypted_text,
      key_a      = null,
      key_b      = null,
      operation,
    } = await req.json();

    if (
      !user_id ||
      !cipher_type ||
      !plaintext ||
      !encrypted_text ||
      !operation
    ) {
      return NextResponse.json(
        { error: "Missing one of: user_id, cipher_type, plaintext, encrypted_text, operation" },
        { status: 400 }
      );
    }

    const id = await insertHistory(
      Number(user_id),
      cipher_type,
      plaintext,
      encrypted_text,
      key_a !== null ? Number(key_a) : null,
      key_b !== null ? Number(key_b) : null,
      operation
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id       = searchParams.get("id");
  const clearAll = searchParams.get("all");
  const userId   = searchParams.get("user_id");

  try {
    // Delete a single record
    if (id) {
      await deleteHistory(Number(id));
      return new NextResponse(null, { status: 204 });
    }

    // Clear all for a user
    if (clearAll === "true") {
      if (!userId) {
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }
      await deleteAllHistory(Number(userId));
      return new NextResponse(null, { status: 204 });
    }

    // Neither path matched
    return NextResponse.json(
      { error: "Missing id (to delete one) or all+user_id (to clear)" },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
