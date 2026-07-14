# Changelog

All notable changes to `n8n-nodes-zaple` are documented in this file.

## 0.1.3 — 2026-07-14

### Fixed

- Node icon rendered blank/stale in some n8n frontends: the 0.1.2 icon embedded the logo as a
  raster image inside SVG, which icon sanitizers can strip. Icons are now true vector paths
  (traced from the official logo) — smaller, sharper, and sanitizer-proof.

## 0.1.2 — 2026-07-14

### Changed

- Replaced the placeholder icon with the official Zaple logo (light + dark variants).

## 0.1.1 — 2026-07-14

### Fixed

- Executing any Zaple operation failed with `Could not get parameter "authentication"`: n8n's
  declarative routing engine selects between multiple credentials only via an `authentication`
  parameter, not via resource-scoped `displayOptions`. Credentials are now keyed on a hidden
  `authentication` parameter that follows the selected resource automatically — no UI change.
  If a workflow created with 0.1.0 still errors after updating, open it and save it once.

## 0.1.0 — 2026-07-14

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
