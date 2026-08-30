# Authentication for the Duck Entertainment API

This document describes what the API actually does. There is **no OAuth authorization server**, **no OpenID Connect issuer**, and **no automated agent registration**.

## Public reads — start here

These endpoints need **no token**:

- `GET /api/health`
- `GET /api/v1/trips` (and `GET /api/v1/trips/{id}`)
- `GET /api/v1/destinations` (and `GET /api/v1/destinations/{id}`)
- `GET /api/v1/suppliers` (and `GET /api/v1/suppliers/{id}`)
- `GET /api/v1/tour-guides` (and `GET /api/v1/tour-guides/{id}`)
- MCP at `POST/GET /api/mcp` (read-only tools)

Machine-readable catalogue: `/openapi.json`. Human docs: `/docs/api`.

## Session JWT (humans and dashboards)

`POST /api/v1/auth/login` accepts either:

- `{ "email": "…", "password": "…" }`, or
- `{ "google_token": "…" }` (Google ID token; new users also need `"role": 0 | 1`)

A successful response is `{ "token": "<jwt>" }`. The token is a **72-hour** HS256 JWT (`user_id`, `role`).

Send it as:

```
Authorization: Bearer <token>
```

`GET /api/v1/auth/me` verifies the token and returns the user. Missing or malformed `Authorization` headers return 401. A valid token with the wrong role on an admin route returns 403 (not 401).

### Roles

| role | meaning |
|------|---------|
| `0` | user |
| `1` | supplier |
| `2` | admin |

Supplier and admin write routes (create trip, edit destination, list all feedback, …) require this bearer token. They are **not** advertised as agent tools.

## Guest booking

`POST /api/v1/bookings/manual` uses **optional auth**. Guests can book with no token. If a valid bearer is present, the booking is attached to that user.

The body requires `trip_id`, `full_name`, `phone_number`, and `booking_date`. Optional fields include `resource_type` (`kayak` | `water_cycle` | `sup`), guest counts, and `declared_amount`. A 409 means the supplier has no remaining kit for that date.

Agents should prefer handing the user to `/book?trip=<id>` rather than posting PII themselves.

## What does not exist

- No `/.well-known/openid-configuration`
- No `/.well-known/oauth-authorization-server`
- No `authorization_endpoint`, `register_uri`, ID-JAG, or claim ceremony
- No OAuth scopes (`scopes_supported` is omitted from `/.well-known/oauth-protected-resource` for that reason)
- **Automated agent registration is not supported.** Do not look for a registration URL.

Protected-resource metadata: `/.well-known/oauth-protected-resource`.
