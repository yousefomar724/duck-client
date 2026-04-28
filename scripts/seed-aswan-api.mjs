/**
 * Seeds Aswan destination + kayak trips via the Duck API (POST /destinations, POST /trips).
 * Reads payload from scripts/aswan-seed-data.json (edit that file to change copy or prices).
 *
 * Usage (from repo root, after `cd duck-web`):
 *   API_URL=http://localhost:8080/api/v1 ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret pnpm seed:aswan
 *
 * Or skip login and pass a JWT from the browser (admin user):
 *   API_URL=http://localhost:8080/api/v1 ADMIN_TOKEN=eyJhbG... pnpm seed:aswan
 *
 * Optional env:
 *   SUPPLIER_ID   - explicit supplier row id for trips (admin-created trips require a valid FK).
 *                   If omitted, uses GET /suppliers and picks the first supplier (recommended).
 *   FORCE_SEED    - if "1", always POST destination/trips even when matching Arabic names exist (may duplicate rows)
 *
 * Requires: Node 18+
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
const base = API_URL.replace(/\/$/, "")

const FORCE_SEED = process.env.FORCE_SEED === "1"

function normalizeList(json) {
  if (json == null) return []
  return Array.isArray(json) ? json : []
}

function arName(nameField) {
  if (nameField == null) return ""
  if (typeof nameField === "string") return nameField
  if (typeof nameField === "object" && "ar" in nameField) return String(nameField.ar ?? "")
  return ""
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = typeof data === "object" && data?.error ? data.error : text
    throw new Error(`${res.status} ${res.statusText}: ${err}`)
  }
  return data
}

async function login() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD, or ADMIN_TOKEN (admin JWT)",
    )
  }
  const body = await fetchJson(`${base}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  const token = body?.token
  if (!token) throw new Error("Login response missing token")
  return token
}

async function resolveToken() {
  const existing = process.env.ADMIN_TOKEN?.trim()
  if (existing) return existing
  return login()
}

async function main() {
  const seedPath = join(__dirname, "aswan-seed-data.json")
  const seed = JSON.parse(readFileSync(seedPath, "utf8"))

  let destinations = []
  try {
    destinations = normalizeList(await fetchJson(`${base}/destinations`))
  } catch (e) {
    console.warn("Could not list destinations (optional):", e.message)
  }

  let trips = []
  try {
    trips = normalizeList(await fetchJson(`${base}/trips`))
  } catch (e) {
    console.warn("Could not list trips (optional):", e.message)
  }

  const destNeedleAr = seed.destination.name.ar.trim()
  let destinationId = destinations.find(
    (d) => arName(d.name).trim() === destNeedleAr,
  )?.id

  const token = await resolveToken()
  const authHeaders = { Authorization: `Bearer ${token}` }

  let supplierId
  const explicit = process.env.SUPPLIER_ID?.trim()
  if (explicit) {
    supplierId = Number(explicit) || 0
    if (!supplierId) {
      throw new Error(`Invalid SUPPLIER_ID=${explicit}`)
    }
    console.log(`Using SUPPLIER_ID from env: ${supplierId}`)
  } else {
    let suppliers = []
    try {
      suppliers = normalizeList(await fetchJson(`${base}/suppliers`, { headers: authHeaders }))
    } catch (e) {
      console.warn("Could not list suppliers:", e.message)
    }
    if (suppliers.length === 0) {
      throw new Error(
        "No suppliers in the database. Register a supplier user (POST /auth/register with role supplier) or create a supplier row, then rerun. You can also set SUPPLIER_ID if one already exists.",
      )
    }
    supplierId = suppliers[0].id ?? suppliers[0].ID
    if (!supplierId) {
      throw new Error("Could not read supplier id from GET /suppliers response")
    }
    console.log(`Using first supplier id=${supplierId} (${suppliers.length} total)`)
  }

  if (destinationId && !FORCE_SEED) {
    console.log(`Using existing destination id=${destinationId} (same Arabic name)`)
  }

  if (!destinationId || FORCE_SEED) {
    if (destinationId && FORCE_SEED) {
      console.warn("FORCE_SEED: creating another destination with same names (duplicate risk)")
    }
    console.log("Creating destination...")
    const created = await fetchJson(`${base}/destinations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(seed.destination),
    })
    destinationId = created?.id ?? created?.ID
    if (!destinationId)
      throw new Error("Destination create response missing id")
    console.log(`Created destination id=${destinationId}`)
  }

  for (const tripPartial of seed.trips) {
    const needleAr = tripPartial.name.ar.trim()
    if (
      !FORCE_SEED &&
      trips.some((t) => arName(t.name).trim() === needleAr)
    ) {
      console.log(`Skip trip (exists): "${needleAr.slice(0, 40)}..."`)
      continue
    }

    const payload = {
      ...tripPartial,
      supplier_id: supplierId,
      destination_ids: [destinationId],
    }

    console.log(`Creating trip: "${needleAr.slice(0, 48)}..."`)
    const created = await fetchJson(`${base}/trips`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
    console.log(`  ok trip id=${created?.id ?? created?.ID ?? "?"}`)
  }

  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
