# n8n-nodes-zaple

An n8n community node for the [Zaple.ai](https://zaple.ai) WhatsApp Business API — send WhatsApp template and service messages, manage message templates, run batch campaigns, capture leads, and manage product catalogs from your workflows, plus a trigger node that starts workflows from Zaple webhook events.

[n8n](https://n8n.io/) is a fair-code licensed workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Zaple Trigger](#zaple-trigger)
- [Example workflows](#example-workflows)
- [Usage notes](#usage-notes)
- [Known Zaple API quirks](#known-zaple-api-quirks)
- [Compatibility](#compatibility)
- [Resources](#resources)
- [Version history](#version-history)

## Installation

### Via the n8n UI (recommended)

1. Open **Settings → Community Nodes** in your n8n instance.
2. Select **Install**.
3. Enter `n8n-nodes-zaple` as the npm package name.
4. Acknowledge the community-node risk prompt and select **Install**.

The **Zaple** and **Zaple Trigger** nodes appear in the node panel once installation finishes.

### Manual install (self-hosted)

If your self-hosted instance does not allow installing community nodes through the UI:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-zaple
```

Then restart n8n. See the [n8n community node installation docs](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

## Credentials

Zaple has two separate authentication systems, so this package ships two credential types.

### Zaple API

Used by the **Message**, **Template**, **Batch**, and **Catalog** resources.

1. Log in at [app.zaple.ai](https://app.zaple.ai).
2. Open **Settings → API & Developer**.
3. Copy the **API Key** and **API Secret** into the n8n credential fields.
4. Select **Test** — n8n performs a harmless read-only request to verify the key pair.

### Zaple Leads API

Used **only** by the **Lead** resource — you do not need this credential otherwise.

1. In [app.zaple.ai](https://app.zaple.ai), open the **Leads** settings.
2. Create (or rotate) a Lead API key pair. The key starts with `zpl_lead_` and the secret with `zpls_`.
3. The secret is shown **once** at create/rotate time — copy it immediately.
4. Enter both values into the n8n credential fields.

This credential has no Test button by design: the only Leads endpoint creates data, so there is no safe read-only test request.

## Operations

The **Zaple** node exposes 5 resources with 28 operations:

| Resource | Operation | Description |
|---|---|---|
| Message | Send Template Message | Send a pre-approved WhatsApp template message |
| Message | Send Service Message | Send a free-form text, image, audio, video, document, or location message inside the 24-hour customer service window |
| Message | Get Message Status | Get the delivery status of a sent message |
| Message | Get Message Count | Get sent/read message counts for a date range |
| Template | Get Many | Retrieve a list of templates (filter by search, category, status, active, favorite) |
| Template | Get | Retrieve a single template |
| Template | Preview | Retrieve a rendered preview of a template |
| Template | Create | Create a WhatsApp message template and submit it for Meta approval |
| Template | Update | Update an existing template |
| Template | Check Status | Check the Meta approval status of a template |
| Template | Activate/Deactivate | Turn a template on or off for sending |
| Template | Delete | Delete a template |
| Batch | Create Contact List | Create a new contact list for batch messaging |
| Batch | Upsert Contacts | Add contacts to a list, updating any that already exist |
| Batch | Send Batch | Send a template message to every contact in a list, immediately or scheduled |
| Batch | Get Batch Status | Get the current processing status of a batch send |
| Batch | Get Batch Details | Get the paginated per-recipient results of a batch |
| Batch | Delete List | Delete a contact list that was created via the API |
| Batch | Delete Batch | Delete a future scheduled batch before it runs |
| Lead | Submit | Submit a captured lead with optional attribution and custom fields |
| Catalog | Get Many | Retrieve all product catalogs |
| Catalog | Create | Create a new product catalog |
| Catalog | Connect WABA | Connect a catalog to your WhatsApp Business Account |
| Catalog | Disconnect WABA | Disconnect a catalog from your WhatsApp Business Account |
| Catalog | List Products | Retrieve the products of a catalog |
| Catalog | Create Product | Add a product to a catalog |
| Catalog | Get Commerce Settings | Get the WhatsApp commerce settings of the connected account |
| Catalog | Set Visibility | Show or hide a catalog |

## Zaple Trigger

Zaple has no webhook-registration API, so the trigger uses a one-time manual setup:

1. Create a workflow and add the **Zaple Trigger** node as its trigger.
2. In the node, select the **Events** that should start the workflow.
3. Copy the **Production URL** from the node's webhook panel.
4. In [app.zaple.ai](https://app.zaple.ai), open **Settings → Webhooks** and paste the URL.
5. Activate the workflow. (While building, use the **Test URL** instead — it is only live while "Listen for test event" is active.)

**Security note:** Zaple does not sign its webhook requests, so the node cannot verify that a delivery genuinely came from Zaple. Treat the webhook URL as a secret — anyone who knows it can start your workflow with forged payloads.

### Events

Zaple forwards Meta/WhatsApp-native webhook envelopes. The trigger classifies each delivery and only starts the workflow for events you selected:

- **Message Status Update** — a sent message changed status (sent / delivered / read / failed), including pricing info and your `biz_opaque_callback_data` echo.
- **Incoming Message / Button Reply** — a WhatsApp user sent a message or tapped a quick-reply button (the button `payload` is included).
- **Template Status Update** — Meta approved or rejected a message template.
- **All Events** — emits every delivery, **including payloads the classifier does not recognize** (for example, Zaple's simpler `{event, timestamp, data}` shape). Select this if you need events beyond the three above.

## Example workflows

### Send a WhatsApp template message

1. Add a **Manual Trigger** node.
2. Add a **Zaple** node. Set **Resource** to **Message** and **Operation** to **Send Template Message**.
3. Set **Template ID** to the send-API template identifier shown in your Zaple template library, **Country Code** to your recipient's country calling code (for example `91`), and **Send To** to the recipient's number (for example `9876543210`).
4. If the template has `{{1}}`, `{{2}}`, … placeholders, add **Template Arguments** in order — they are sent as `template_argument1..N`.
5. Execute the workflow and check the response's `message_id`.

### React to button replies

1. Add a **Zaple Trigger** node as the workflow's trigger and set **Events** to **Incoming Message / Button Reply**.
2. Copy the **Production URL** from the node's webhook panel and paste it into Zaple under **Settings → Webhooks**.
3. Connect an **IF** node routing on `{{ $json.entry[0].changes[0].value.messages[0].button.payload }}` to branch on the quick-reply payload you set when sending the message (for example `approve_67`).
4. Activate the workflow.

## Usage notes

### "Template ID" means three different things

Zaple's API uses the field name `template_id` for three different identifiers. Each operation's Template ID field states which one it expects:

| Operations | Which identifier to pass |
|---|---|
| Message → Send Template Message · Batch → Send Batch · Template → Get, Preview, Check Status | **Send-API template identifier** (shown in the Zaple template library) |
| Template → Update, Delete | **Numeric database ID** (as returned by Template → Create) |
| Template → Activate/Deactivate | **Template name identifier** |

Passing the wrong kind of ID typically produces a "not found" or validation error even though the template exists.

### Template arguments

The **Template Arguments** list fills the template's `{{1}}`, `{{2}}`, … placeholders **in order** — the node sends them to Zaple as `template_argument1`, `template_argument2`, and so on. Likewise, **Quick Reply Payloads** are sent as `quick_reply_payload1..N` in order.

### Sending media

Media (image / audio / video / document) can be provided in two ways:

- **Public URL** — a URL that Zaple's servers can fetch.
- **Base64** — the raw file content, base64-encoded. To send binary data produced by a previous node, select Base64 and use an expression like `{{ $binary.data.data }}` (n8n stores binary attachments base64-encoded in the `data` property).

Direct multipart file upload is not supported in this version. Document service messages additionally require the send-API identifier of a template configured with a document header.

## Known Zaple API quirks

- **HTTP 400 with a business error code** — `daily_limit_reached`, `plan_expired`, or `insufficient_balance`. These are account-level conditions (daily quota, subscription, wallet balance), not workflow bugs; resolve them in the Zaple dashboard.
- **HTTP 419** — the template is inactive, or the recipient number is blocked.
- **HTTP 422** — request validation failed; check the field errors in the response.
- **HTTP 429** — rate limited; enable **Retry On Fail** in the node settings if you hit this.
- Batch **Scheduled Datetime** values are normalized by Zaple to the Asia/Kolkata timezone.

## Compatibility

- Requires **n8n 1.x or later** (built against the `n8n-workflow` 1.x API; tested on the n8n 1.x release current at publish time).
- No runtime dependencies — the package only peer-depends on `n8n-workflow`, which n8n itself provides.
- **Node.js 22+** is required only for *developing* this package; using it inside n8n has no extra requirement.

## Resources

- [Zaple documentation](https://zaple.ai/docs/)
- [Zaple](https://zaple.ai)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Version history

### 0.1.0

Initial release: Message, Template, Batch, Lead, and Catalog resources (28 operations), the Zaple Trigger webhook node, and two credential types (Zaple API, Zaple Leads API).
