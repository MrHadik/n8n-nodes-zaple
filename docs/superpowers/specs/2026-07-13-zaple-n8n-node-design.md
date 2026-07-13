# Design: `n8n-nodes-zaple` — n8n Community Node for the Zaple.ai WhatsApp Business API

**Date:** 2026-07-13
**Status:** Approved by Hardik (design review in brainstorming session)
**Goal:** Build and publish an npm community node package that integrates Zaple.ai (WhatsApp Business messaging platform) into n8n, meeting n8n's verified-community-node requirements.

---

## 1. Context & Goals

Zaple.ai is a WhatsApp Business messaging platform (template messages, service messages,
batch campaigns, lead capture, product catalogs, webhooks). There is currently **no Zaple
package on npm** — `n8n-nodes-zaple` is available.

Decisions made during brainstorming:

| Decision | Choice |
|---|---|
| API coverage | Full — all 5 resource areas (28 operations) |
| Trigger node | Yes — webhook trigger for Zaple events |
| Distribution | npm publish + built to qualify for n8n **verification** |
| Node style | **Declarative** (routing metadata) + `preSend` hooks for API quirks |
| Owner has | Zaple API credentials, npm account, GitHub account, n8n on own server |

## 2. Package & Tooling (current 2026 n8n standards)

- **Name:** `n8n-nodes-zaple` · **License:** MIT · **Language:** TypeScript
- Scaffold per current official starter (`n8n-io/n8n-nodes-starter` / `npm create @n8n/node`):
  - Dev tooling: `@n8n/node-cli` (`n8n-node build|dev|lint|release`) — **no gulp, no .eslintrc.js**
  - `eslint.config.mjs` (flat config re-exporting `@n8n/node-cli/eslint`), `.prettierrc.js` (tabs, single quotes, printWidth 100)
  - `tsconfig.json` per starter (strict, commonjs, es2019 target, outDir dist)
  - Node.js **v22+** required for development
- **package.json** requirements (verification-critical):
  - `keywords: ["n8n-community-node-package"]`
  - `files: ["dist"]`, `peerDependencies: { "n8n-workflow": "*" }`
  - **NO runtime `dependencies`** (hard verification rule)
  - `n8n` attribute: `n8nNodesApiVersion: 1`, `strict: true`, lists of compiled credential/node paths
  - `repository` URL pointing at the public GitHub repo (npm↔GitHub match is checked)
- **CI/CD:** `.github/workflows/ci.yml` (lint + build) and `publish.yml` (tag `*.*.*` → `npm run release` with `id-token: write` for **npm provenance** — mandatory for verification since 2026-05-01; publish via npm Trusted Publisher OIDC, `NPM_TOKEN` as fallback)

### Project structure

```
n8n-nodes-zaple/
├── package.json / tsconfig.json / eslint.config.mjs / .prettierrc.js
├── LICENSE.md (MIT) / README.md / CHANGELOG.md
├── .github/workflows/ci.yml, publish.yml
├── icons/zaple.svg (+ zaple.dark.svg if needed)
├── credentials/
│   ├── ZapleApi.credentials.ts
│   └── ZapleLeadsApi.credentials.ts
└── nodes/
    ├── Zaple/
    │   ├── Zaple.node.ts          (declarative; assembles resource descriptions)
    │   ├── Zaple.node.json        (codex: categories, docs links)
    │   ├── resources/
    │   │   ├── message/  (sendTemplate.ts, sendService.ts, getStatus.ts, getCount.ts, index.ts)
    │   │   ├── template/ (list.ts, get.ts, preview.ts, create.ts, update.ts, checkStatus.ts, setActive.ts, delete.ts, index.ts)
    │   │   ├── batch/    (createList.ts, upsertContacts.ts, send.ts, getStatus.ts, getDetails.ts, deleteList.ts, deleteBatch.ts, index.ts)
    │   │   ├── lead/     (submit.ts, index.ts)
    │   │   └── catalog/  (getAll.ts, create.ts, connectWaba.ts, disconnectWaba.ts, listProducts.ts, createProduct.ts, getCommerceSettings.ts, setVisibility.ts, index.ts)
    │   └── shared/
    │       └── preSendFunctions.ts (mapTemplateArguments, mapQuickReplyPayloads, …)
    └── ZapleTrigger/
        ├── ZapleTrigger.node.ts
        ├── ZapleTrigger.node.json
        └── (icon reference shared from /icons)
```

## 3. Credentials — two types (mirrors Zaple's real auth split)

### 3.1 `zapleApi` (ZapleApi.credentials.ts) — used by Message/Template/Batch/Catalog
- Fields: **API Key**, **API Secret** (both `typeOptions: { password: true }`)
- `authenticate: IAuthenticateGeneric` type `generic`, injecting headers:
  - `Zaple-Api-Key: {{$credentials.apiKey}}`
  - `Zaple-Api-Secret: {{$credentials.apiSecret}}`
- `test: ICredentialTestRequest` → `GET https://app.zaple.ai/api/v3/templates?per_page=1`
- `documentationUrl` → https://zaple.ai/docs/ (keys from Settings → API & Developer)

### 3.2 `zapleLeadsApi` (ZapleLeadsApi.credentials.ts) — used ONLY by Lead resource
- Fields: **Lead API Key** (`zpl_lead_…`), **Lead API Secret** (`zpls_…`)
- Injects headers `X-Zaple-Api-Key` / `X-Zaple-Api-Secret` (note the `X-` prefix — different from main API)
- No credential test (the only lead endpoint is a state-creating POST; no safe read-only test exists)
- In the node: `credentials[].displayOptions.show.resource: ['lead']` so it's only requested for Lead operations; `zapleApi` shown for all other resources.

## 4. `Zaple` action node (declarative)

Node description: `displayName: 'Zaple'`, `name: 'zaple'`, `group: ['output']` (transform-style consumer),
`usableAsTool: true`, `subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}'`,
`requestDefaults: { baseURL: 'https://app.zaple.ai', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }`.

Request bodies are sent as JSON by default (v3 send accepts JSON; Laravel backends generally accept
JSON everywhere). **Fallback plan:** if live testing shows a v2 endpoint rejecting JSON, add a
`preSend` that re-encodes the body as form data for that operation only.

### 4.1 Verified endpoint map (from live docs extraction — headings vs cURL conflicts resolved in favor of cURL)

**Resource: Message** (credential: zapleApi)

| Operation | Method & Path | Key fields |
|---|---|---|
| Send Template | `POST /api/v3/send-template-message` | `template_id` (send-API ID), `country_code`, `send_to` required; template arguments list → `template_argument1..N` via preSend; optional `header_argument`, `tags[]`, quick-reply payload list → `quick_reply_payload1..N` via preSend; `biz_opaque_callback_data` (stringified JSON); media: `media_url_type` (`public_url`\|`base64`) + `media_url`/`base64`, `file_name` (documents) |
| Send Service Message | `POST /api/v2/send-service-message` | `country_code`, `send_to`, `type` (`text`\|`image`\|`audio`\|`video`\|`document`\|`location`); per-type: `text` (content/caption), media trio as above; document additionally requires `template_id` + optional `file_name`, `template_argumentN`; location: `latitude`, `longitude`, optional `name`, `address` (docs ambiguous flat-vs-nested — resolve in live testing) |
| Get Message Status | `GET /api/v2/message-status?message_id=` | `message_id` required |
| Get Message Count | `GET /api/v2/message-count` | optional `from_date`, `to_date` (`yyyy-mm-dd hh:mm:ss`) |

**Resource: Template** (credential: zapleApi)

| Operation | Method & Path | Key fields / ID semantics |
|---|---|---|
| List | `GET /api/v3/templates` | optional `search`, `page`, `per_page`, `category` (UTILITY/MARKETING/AUTHENTICATION/CAROUSEL), `status` (APPROVED/PENDING/REJECTED), `active`, `favorite` |
| Get | `GET /api/v3/template/{id}` | `{id}` = **send-API template identifier** |
| Preview | `GET /api/v3/template/{id}/preview` | `{id}` = send-API identifier |
| Create | `POST /api/v3/create-template` | `title`, `category` (`utility`\|`marketing`\|`utility_marketing`\|`authentication`), `language`, `content` (body w/ `{{1}}` vars); optional `contentType` (`none`\|`text`\|`image`\|`video`\|`document`\|`location`), `headerText`, `templateImage`/`templateVideo`/`templateDocument` (URL or base64), `templateLocation{name,address,latitude,longitude}`, `footerText`, `variable_type` (`numeric`\|`named`), `variable_samples[]`, `buttons[]` (quick_reply→`replies:[{text}]`, url→`websites:[{text,url}]`, phone_number, copy_offer_code, catalog), auth-only: `addSecurityRecommendation`, `copyOtpButtonText`, `enableCodeExpiration`, `codeExpirationMinutes` |
| Update | `POST /api/v3/update-template` | `template_id` = **numeric DB ID**; `title`, `category`, `language`, `contentType`, `content` required; optional as Create |
| Check Status | `GET /api/v3/template/status?template_id=` | `template_id` = **send-API identifier** |
| Activate/Deactivate | `POST /api/v3/template-activation` | `template_id` = **name identifier**; `activation_status` `"1"`/`"0"` |
| Delete | `POST /api/v3/template/delete` | `template_id` = **numeric DB ID** (integer) |

> `template_id` means three different things across endpoints. Every operation's field gets an
> explicit displayName + description stating WHICH id it wants (e.g. "Template ID (numeric database
> ID, as returned by Create)"). This is a UX requirement, not optional polish.

**Resource: Batch** (credential: zapleApi)

| Operation | Method & Path | Key fields |
|---|---|---|
| Create Contact List | `POST /api/v2/lists` | `name` required |
| Upsert Contacts | `POST /api/v2/lists/{list_id}/contacts` | `contacts[]` of `{country_code, phone_number, name}` — UI: fixedCollection with multipleValues, plus a JSON-input mode for bulk mapping |
| Send Batch | `POST /api/v2/messages/batch` | `template_id`, `list_id` required; optional `scheduled_enabled` (boolean) + `scheduled_datetime` (normalized to Asia/Kolkata by Zaple) |
| Get Batch Status | `GET /api/v2/messages/batch/{batch_id}/status` | path `batch_id` |
| Get Batch Details | `GET /api/v2/messages/batch/{batch_id}/details` | path `batch_id`; paginated response |
| Delete List | `DELETE /api/v2/lists/{id}` | only API-created lists deletable |
| Delete Batch | `DELETE /api/v2/messages/batch/{batch_id}` | only future scheduled batches deletable |

**Resource: Lead** (credential: zapleLeadsApi)

| Operation | Method & Path | Key fields |
|---|---|---|
| Submit | `POST /api/v1/leads` | at least one of `phone`/`email` required; optional `full_name`, `campaign_name`, `message`, `source`, `external_event_id` (idempotency), `utm_source`, `utm_medium`, `utm_campaign`, `meta` (object), `custom_fields` (free-form key→value object; UI: fixedCollection key/value pairs + raw-JSON option) |

**Resource: Catalog** (credential: zapleApi)

| Operation | Method & Path | Key fields |
|---|---|---|
| Get All | `GET /api/v2/catalogs` | — |
| Create | `POST /api/v2/catalogs` | `name` |
| Connect WABA | `POST /api/v2/catalogs/{catalog_id}/connect` | path id |
| Disconnect WABA | `POST /api/v2/catalogs/{catalog_id}/disconnect` | path id |
| List Products | `GET /api/v2/catalogs/{catalog_id}/products` | path id |
| Create Product | `POST /api/v2/catalogs/{catalog_id}/products` | `name` required; optional `retailer_id`, `price`, `currency`, `image_url`, `description`, `brand`, `category`, `condition`, `availability`, `url`, `gender`, `size`, `color`, `material`, `pattern`, `sale_price`, `sale_price_start_date`, `sale_price_end_date`, `additional_image_urls[]`, `inventory`, `product_type`, `origin_country`, `visibility` |
| Get Commerce Settings | `GET /api/v2/commerce/settings` | (cURL path; heading said `/api/v2/catalogs/commerce-settings` — verify live) |
| Set Visibility | `POST /api/v2/catalogs/{catalog_id}/visibility` | `visible` (boolean) |

### 4.2 preSend functions (`nodes/Zaple/shared/preSendFunctions.ts`)

Small typed functions attached via `routing.send.preSend` (signature:
`(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>`):

1. **mapTemplateArguments** — reads the node's `templateArguments` list parameter, writes
   `template_argument1..N` into `requestOptions.body`, removes the list key.
2. **mapQuickReplyPayloads** — same pattern → `quick_reply_payload1..N`.
3. **mapBatchContacts** — fixedCollection or JSON string → `contacts[]` array.
4. **mapCustomFields** — lead key/value pairs → `custom_fields` object.
5. (contingency) **encodeAsFormData** — re-encode a JSON body as form data if a v2 endpoint
   rejects JSON during live testing.

### 4.3 Deliberately out of scope (v0.1)
- `media_url_type=file` (multipart upload) — users can pass base64 (`{{ $binary.data.data }}` expression works today); revisit in a later minor version.
- v2 send-template-message endpoint — superseded by v3 (same fields + more).
- Undocumented "contact"-type service message (no docs exist).

## 5. `Zaple Trigger` node — manual-setup webhook

Zaple has **no webhook-registration API** (user pastes URL into app.zaple.ai → Settings → Webhooks),
so the node follows n8n's established manual pattern (per core ChargebeeTrigger):

- `group: ['trigger']`, `inputs: []`, `outputs: [NodeConnectionTypes.Main]`
- `webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }]`
- **NO `webhookMethods`** — n8n exposes Test/Production URLs automatically
- A `type: 'notice'` property instructing: "Copy the Production URL above into Zaple → Settings → Webhooks"
- **Events** `multiOptions` filter. Zaple sends Meta/WhatsApp-native envelopes
  (`{object: 'whatsapp_business_account', entry: [{changes: [{field, value}]}]}`). Filtering inspects
  `changes[].field` + value content:
  - *Message Status Update* — `field: 'messages'` with `value.statuses[]` (sent/delivered/read/failed; includes `biz_opaque_callback_data` echo + pricing)
  - *Incoming Message / Button Reply* — `field: 'messages'` with `value.messages[]` (incl. `type: 'button'` with the quick-reply `payload`)
  - *Template Status Update* — `field: 'message_template_status_update'` (APPROVED/REJECTED etc.)
  - *All Events* — `*` wildcard, emit raw payload
- `webhook()` returns `{ workflowData: [this.helpers.returnJsonArray(...)] }` for matches, `{}` (200-ack, no workflow run) for non-matches.
- No signature verification — Zaple doesn't document a signing secret. README will note this and recommend treating the URL as a secret.
- The docs also show a simpler `{event, timestamp, data}` shape in one section; the trigger tolerates both shapes (if no `entry[]` envelope is present, pass the body through the event filter by its `event` key, else emit raw).

## 6. Error handling

- Declarative routing surfaces non-2xx responses through n8n's standard `NodeApiError` path
  (honors the user's "Continue on Fail" setting).
- Known Zaple business errors get friendlier messages via response hints in README/docs:
  `daily_limit_reached`, `plan_expired`, `insufficient_balance` (400), template-inactive/blocked (419),
  validation (422), rate limit (429).
- No retries built in (n8n users configure retry on the node level).

## 7. Testing plan

1. **Lint gates:** `npm run lint` (`n8n-node lint`) clean; `npx @n8n/scan-community-package n8n-nodes-zaple` pass.
2. **Local live testing:** `npm run dev` (starts local n8n at `http://localhost:5678` with the node hot-loaded). With Hardik's real Zaple credentials, exercise at minimum:
   - credential test, Send Template (with variables + quick-reply payloads), Send Service Message (text), Template List/Get/Preview, Batch full lifecycle (create list → upsert contacts → send/schedule → status → details), Lead Submit, Catalog Get All.
   - Trigger: paste test URL into Zaple settings, send a message, observe status webhook.
   - Resolve the 4 flagged doc ambiguities live: batch paths, commerce-settings path, service-location body shape, JSON acceptance on v2 endpoints.
3. **Server install test:** after npm publish, install on Hardik's n8n server via Settings → Community Nodes.

## 8. Publish & verification pipeline

1. Create public GitHub repo `n8n-nodes-zaple` under Hardik's account; push.
2. Configure npm **Trusted Publisher** (OIDC) for the repo (or `NPM_TOKEN` secret fallback).
3. Tag `v0.1.0` → `publish.yml` runs `npm run release` with provenance (**mandatory for verification since 2026-05-01**).
4. Verify install from npm on the server.
5. Submit at **creators.n8n.io/nodes** for verification. Checklist already satisfied by design:
   MIT license ✓, no runtime deps ✓, `n8n-nodes-` name ✓, keyword ✓, one service per package ✓
   (trigger for same service is allowed), English-only UI ✓, no env/fs access ✓, README with
   auth + usage + example workflows ✓, npm↔GitHub repo match ✓, provenance publish ✓.

## 9. Success criteria

- All 28 operations + trigger work against the live Zaple API.
- `n8n-node lint` and `@n8n/scan-community-package` pass with zero errors.
- Package installs cleanly from npm on Hardik's self-hosted n8n.
- Verification submission requires no rework.
