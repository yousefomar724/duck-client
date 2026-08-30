import { NextResponse } from 'next/server';

/** Bare-error envelope matching the Go API: `{"error": "<string>"}`. */
export function errorResponse(
  status: number,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** `{"message": "..."}` envelope for success-without-data responses. */
export function messageResponse(message: string, status = 200) {
  return NextResponse.json({ message }, { status });
}

/** `{"error": "<summary>", "fields": {...}}` envelope for per-field validation failures. */
export function validationErrorResponse(fields: Record<string, string>) {
  const summary = Object.values(fields)[0] ?? 'بيانات غير صحيحة';
  return NextResponse.json({ error: summary, fields }, { status: 400 });
}
