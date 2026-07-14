# Changelog

All notable changes to `n8n-nodes-zaple` are documented in this file.

## 0.1.0 — 2026-07-13

Initial release.

### Added

- **Zaple** action node with 5 resources / 28 operations:
  - **Message** — Send Template Message, Send Service Message, Get Message Status, Get Message Count
  - **Template** — Get Many, Get, Preview, Create, Update, Check Status, Activate/Deactivate, Delete
  - **Batch** — Create Contact List, Upsert Contacts, Send Batch, Get Batch Status, Get Batch Details, Delete List, Delete Batch
  - **Lead** — Submit
  - **Catalog** — Get Many, Create, Connect WABA, Disconnect WABA, List Products, Create Product, Get Commerce Settings, Set Visibility
- **Zaple Trigger** webhook node with event filtering: Message Status Update, Incoming Message / Button Reply, Template Status Update, All Events
- Two credential types: **Zaple API** (`Zaple-Api-Key`/`Zaple-Api-Secret` headers) and **Zaple Leads API** (`X-Zaple-Api-Key`/`X-Zaple-Api-Secret` headers, Lead resource only)
