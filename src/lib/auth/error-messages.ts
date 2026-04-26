"use client"

import { useTranslations } from "next-intl"
import { useCallback } from "react"

/** Raw English errors returned to UI / stored in `ApiResponse.error` — look up in `AUTH_ERROR_MAP` (lowercased). */
export const AUTH_API_ERROR = {
  loginFailed: "Login failed",
  invalidGoogleSignIn: "Invalid Google sign-in. Please try again.",
  invalidGoogleCredential: "Invalid Google credential",
} as const

/**
 * Message keys under `auth.errors` in en.json / ar.json.
 * Values are the raw English strings the Go API (or our client) returns in `body.error`.
 * Keys in this map are lowercased to match the normalized lookup in resolveAuthErrorMessage.
 */
const AUTH_ERROR_MAP: Record<string, string> = {
  "invalid input": "invalidInput",
  "email already registered": "emailAlreadyRegistered",
  "username already taken": "usernameAlreadyTaken",
  "account already exists": "accountAlreadyExists",
  "failed to register user": "registerFailed",
  "invalid credentials": "invalidCredentials",
  "invalid google token": "invalidGoogleToken",
  "google token missing email": "googleTokenMissingEmail",
  "role is required for new google user": "googleRoleRequired",
  "invalid or expired token": "invalidOrExpiredToken",
  "invalid token type": "invalidTokenType",
  "user not found": "userNotFound",
  "user not found.": "userNotFound", // defensive
  "failed to process request": "forgotProcessFailed",
  "missing authorization header": "missingAuthorizationHeader",
  "invalid authorization header format": "invalidAuthorizationHeaderFormat",
  "invalid token claims": "invalidTokenClaims",
  "invalid user_id in token": "invalidUserIdInToken",
  "invalid role in token": "invalidRoleInToken",
  "login failed": "loginFailed",
  "invalid google sign-in. please try again.": "invalidGoogleSignIn",
  "invalid google credential": "invalidGoogleCredential",
  "unknown error occurred": "somethingWentWrong",
}

const HTTP_STATUS_PATTERN = /^http\s+(\d{3})$/i

function isNetworkLikeMessage(lower: string): boolean {
  if (lower === "failed to fetch") return true
  if (lower === "load failed" || lower === "the internet connection appears to be offline")
    return true
  if (lower.includes("network") && lower.length < 120) return true
  return false
}

/**
 * Resolves a raw API / client error string to a `auth.errors` message key, then to translated text
 * (when used with the hook) or the key (when using non-hook variant with your own t).
 */
export function resolveAuthErrorToKey(
  raw: string | null | undefined,
): "networkError" | "httpError" | "sessionExpired" | string {
  if (raw == null || raw === "") return "somethingWentWrong"

  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()

  if (isNetworkLikeMessage(lower)) return "networkError"

  if (HTTP_STATUS_PATTERN.test(trimmed)) return "httpError"

  if (lower === "unauthorized") return "sessionExpired"

  const mapped = AUTH_ERROR_MAP[lower]
  if (mapped) return mapped

  return "somethingWentWrong"
}

/**
 * For use in client components with next-intl: maps backend English errors to the active locale.
 */
export function useAuthErrorMessage() {
  const t = useTranslations("auth.errors")
  return useCallback(
    (raw: string | null | undefined): string => {
      if (raw == null || raw === "") return ""
      const key = resolveAuthErrorToKey(raw)
      return t(key)
    },
    [t],
  )
}
