# Agent-readiness (operator notes)

This site publishes real discovery documents for AI agents: robots Content-Signal, `Link` headers, OpenAPI, an RFC 9727 API catalog, a read-only MCP server, Agent Skills, markdown negotiation, RFC 9728 protected-resource metadata, and an ARD manifest.

Guiding rule: never advertise an endpoint that 404s.

## After deploy

Set `NEXT_PUBLIC_SITE_URL=https://duckegy.com` in Vercel. Every absolute URL in `.well-known` JSON is derived from `SITE_URL` in `src/lib/site.ts`.

Then re-scan at [isitagentready.com](https://isitagentready.com). Expect **10 of 12** checks to pass. The two that stay open are intentional:

1. **OAuth / OIDC discovery** — there is no authorization server and no OIDC issuer. Publishing `authorization_endpoint` that 404s would be worse than failing the check. `/.well-known/oauth-protected-resource` is published without `authorization_servers` (optional in RFC 9728).
2. **DNS-AID** — see below.

## DNS-AID (manual; not in this repo)

Passing DNS for AI Discovery needs **SVCB/HTTPS records** and **DNSSEC**. DNS for duckegy.com is on **Vercel**, which supports neither.

If DNS ever moves to a provider that does (Cloudflare supports both; DNSSEC is one click), paste:

```
_index._agents.duckegy.com. 3600 IN SVCB 1 duckegy.com. (
    alpn="h2,mcp" port=443 well-known="mcp/server-card.json" )
```

No application-code change will help until the DNS provider can serve that record.

## Local verification

```bash
pnpm dev
# against http://localhost:3000
curl -sI / | grep -i '^link:'
curl -s /robots.txt | grep -i 'content-signal'
curl -s /.well-known/api-catalog -i | head -20
curl -s /.well-known/ai-catalog.json
curl -s /.well-known/mcp/server-card.json
curl -s /.well-known/agent-skills/index.json
curl -s /.well-known/oauth-protected-resource
curl -s /auth.md | head
curl -sI -H 'Accept: text/markdown' /trips | grep -iE 'content-type|x-markdown-tokens|vary'
```

Confirm every `href` / `url` named by a `.well-known` document returns 200, and that `/trips` still returns HTML with no `Accept` header.

MCP inspector: `npx @modelcontextprotocol/inspector` → streamable HTTP → `http://localhost:3000/api/mcp`.
