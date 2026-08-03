import { NextResponse } from 'next/server';

/** Bare-error envelope matching the Go API: `{"error": "<string>"}`. */
export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** `{"message": "..."}` envelope for success-without-data responses. */
export function messageResponse(message: string, status = 200) {
  return NextResponse.json({ message }, { status });
}
