# Zaple n8n Node — Server Testing Checklist

Run this on your n8n server after `n8n-nodes-zaple` v0.1.0 is published and installed
(Settings → Community Nodes → Install → `n8n-nodes-zaple`). Have ready: your Zaple API
key + secret, a test WhatsApp number you control, and one approved template with 1–2
body variables.

Report back anything that errors — especially items 9–12, which resolve real ambiguities
in Zaple's docs. For each failure, note the operation, the exact error message, and the
HTTP status if shown.

## Setup
1. **Credential test** — create a "Zaple API" credential (key + secret from app.zaple.ai
   → Settings → API & Developer). The credential modal must show a green "Connection
   tested successfully". *(Exercises GET /api/v3/templates.)*

## Core sends
2. **Template List** — Zaple node → Template → Get Many. Expect your templates with names,
   IDs, statuses.
3. **Send Template Message** — Message → Send Template Message with a template ID from
   step 2, country code (e.g. `91`), your test number, and Template Arguments filled in
   order. Expect a `message_id` in the output AND the message on your phone with
   variables substituted.
4. **Quick reply payload** — resend step 3 with a Quick Reply Payload set (if your
   template has buttons). Tap the button on your phone.
5. **Message Status** — Message → Get Message Status with step 3's `message_id`. Expect
   sent/delivered/read timestamps.
6. **Service message** — first reply to the business number from your test phone (opens
   the 24-hour service window), then Message → Send Service Message → type Text. Expect
   delivery.

## Other resources
7. **Batch lifecycle** — Batch → Create Contact List → Upsert Contacts (add your test
   number) → Send Batch (Scheduled disabled) → Get Batch Status → Get Batch Details.
8. **Lead Submit** — create the separate "Zaple Leads API" credential (zpl_lead_… keys
   from the Leads settings), then Lead → Submit with a phone + a custom field. Expect
   201 "Lead captured successfully". Submit again with the same External Event ID —
   expect the idempotent "already processed" response.

## Ambiguity resolutions (the important ones — Zaple's docs contradict themselves here)
9. **Batch status path** — if step 7's Get Batch Status/Details return **404**, tell me:
   the docs show two different paths and we used the cURL variant
   (`/api/v2/messages/batch/{id}/status`). I'll switch to `/api/v2/batch/{id}/status`.
10. **Commerce settings path** — Catalog → Get Commerce Settings. If **404**, we switch
    from `/api/v2/commerce/settings` to `/api/v2/catalogs/commerce-settings`.
11. **JSON body acceptance** — if ANY v2 operation (service message, batch, catalog)
    fails with a 422 "field required" error despite the field being filled, Zaple's v2
    endpoints may demand form-encoding. Tell me which operation; I have an
    `encodeAsFormData` contingency ready to wire in.
12. **Location service message** — Message → Send Service Message → type Location with
    latitude/longitude. If it 422s, the API wants a nested `location` object instead of
    flat fields; I have a `mapServiceLocation` contingency ready.

## Trigger
13. **Zaple Trigger** — new workflow → Zaple Trigger (Events: All Events) → activate →
    copy the **Production URL** → paste into Zaple → Settings → Webhooks. Send yourself
    a template message (step 3). Expect an execution with a status-update payload.
    Then narrow Events to "Message Status Update" and confirm it still fires.
