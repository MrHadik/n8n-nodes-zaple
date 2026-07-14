# n8n-nodes-zaple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `n8n-nodes-zaple` — an n8n community node package for the Zaple.ai WhatsApp Business API (5 resources / 28 operations + a webhook trigger node), meeting n8n's verified-community-node requirements.

**Architecture:** One declarative-style action node (`Zaple`) whose operations are routing metadata assembled from per-resource description files, with small `preSend` hook functions handling Zaple's numbered-field quirks (`template_argument1..N`, `quick_reply_payload1..N`), plus a manual-setup webhook trigger node (`Zaple Trigger`) with a pure, unit-tested event classifier. Two credential types mirror Zaple's split auth (main API headers vs `X-`-prefixed Leads API headers).

**Tech Stack:** TypeScript, `n8n-workflow` (peer dep only), `@n8n/node-cli` tooling (`n8n-node build|dev|lint|release`), vitest for pure-logic unit tests, GitHub Actions publishing to npm with provenance.

**Spec:** `docs/superpowers/specs/2026-07-13-zaple-n8n-node-design.md` (approved). The spec's §4.1 endpoint tables are the field-level source of truth.

## Global Constraints

- Package name `n8n-nodes-zaple`; license **MIT**; keyword `n8n-community-node-package` (verification requirements).
- **ZERO runtime dependencies** — `dependencies` must stay absent/empty; `n8n-workflow` is a `peerDependencies` entry only (hard n8n verification rule).
- Base URL for every API call: `https://app.zaple.ai`.
- Node.js **v22+** for development; code style: tabs, single quotes, trailing commas, printWidth 100 (`.prettierrc.js` is authoritative).
- All UI text (displayNames, descriptions, errors, README) in **English**; boolean descriptions start with "Whether"; every operation option has `action`; option lists alphabetized by `name` (n8n linter rules).
- No environment-variable or filesystem access inside node/credential code (verification rule).
- Node parameter names are camelCase; Zaple API body/query keys are snake_case exactly as in the spec (`country_code`, `send_to`, `template_id`, …).
- Every task must leave the repo green: `npm run build` and `npm run lint` exit 0 (plus `npm test` once Task 3 lands), and ends with a git commit (conventional message).
- Working directory: `G:\Hardik Project\zaple-n8n` (Windows, git repo on branch `main` already initialized).
- Publishing happens **only** via the GitHub Actions `publish.yml` workflow with npm provenance (mandatory for n8n verification since 2026-05-01) — never `npm publish` from a local machine.

---


### Task 1: Scaffold package & tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.js`
- Create: `.gitignore`
- Create: `LICENSE.md`
- Create: `icons/zaple.svg`
- Create: `icons/zaple.dark.svg`
- Modify: none
- Test: none (verified by `npm install` and `npx tsc --noEmit`)

**Interfaces:**
- Consumes: nothing — this is the first task. The project root `G:\Hardik Project\zaple-n8n` is already a git repository on branch `main`; do NOT run `git init`.
- Produces: npm scripts `npm run build` (`n8n-node build`), `npm run lint` (`n8n-node lint`), `npm test` (`vitest run`) — the verification gates every later task runs; the `package.json` `n8n` block with empty `"credentials": []` and `"nodes": []` arrays that Task 2 (credentials), Task 4 (Zaple node), and Task 9 (ZapleTrigger node) fill in; the icon files `icons/zaple.svg` / `icons/zaple.dark.svg` referenced by both node classes in Tasks 4 and 9.

Background for the executor: an n8n "community node" is an npm package that n8n loads at runtime. n8n discovers what the package contains via the custom `n8n` block in `package.json`, which lists COMPILED JavaScript paths under `dist/` (not the TypeScript sources). `@n8n/node-cli` is the official build/lint/dev toolchain (`n8n-node build|dev|lint|release`). Verification-critical rules baked into this scaffold: keyword `n8n-community-node-package`, `files: ["dist"]`, `peerDependencies: { "n8n-workflow": "*" }`, and ZERO runtime `dependencies`. Node.js 22+ is required for development.

- [ ] **Step 1: Create `package.json`** at the project root with exactly this content. `repository.url` and `homepage` deliberately stay `""` — Task 13 fills them with the real GitHub URL after the public repo exists. The `n8n.credentials` and `n8n.nodes` arrays start empty; later tasks append to them.

```json
{
	"name": "n8n-nodes-zaple",
	"version": "0.1.0",
	"description": "n8n community node for the Zaple.ai WhatsApp Business API",
	"license": "MIT",
	"homepage": "",
	"keywords": ["n8n-community-node-package", "n8n", "zaple", "whatsapp"],
	"author": { "name": "Hardik Chavda", "email": "hardik.chavda@pect.in" },
	"repository": { "type": "git", "url": "" },
	"scripts": {
		"build": "n8n-node build",
		"build:watch": "tsc --watch",
		"dev": "n8n-node dev",
		"lint": "n8n-node lint",
		"lint:fix": "n8n-node lint --fix",
		"test": "vitest run",
		"release": "n8n-node release",
		"prepublishOnly": "n8n-node prerelease"
	},
	"files": ["dist"],
	"n8n": { "n8nNodesApiVersion": 1, "strict": true, "credentials": [], "nodes": [] },
	"devDependencies": {
		"@n8n/node-cli": "^0.23.0",
		"eslint": "9.39.4",
		"prettier": "3.8.3",
		"release-it": "20.2.0",
		"typescript": "5.9.3",
		"vitest": "^3.2.4"
	},
	"peerDependencies": { "n8n-workflow": "*" }
}
```

- [ ] **Step 2: Create `tsconfig.json`** at the project root (verbatim from the current n8n-nodes-starter). Note `include` lists `credentials/**/*` and `nodes/**/*` which do not exist yet — that is fine; `package.json` is also an include (with `resolveJsonModule`), so `tsc` always has at least one input.

```json
{
	"compilerOptions": {
		"strict": true,
		"module": "commonjs",
		"moduleResolution": "node",
		"target": "es2019",
		"lib": ["es2019", "es2020", "es2022.error"],
		"removeComments": true,
		"useUnknownInCatchVariables": false,
		"forceConsistentCasingInFileNames": true,
		"noImplicitAny": true,
		"noImplicitReturns": true,
		"noUnusedLocals": true,
		"strictNullChecks": true,
		"preserveConstEnums": true,
		"esModuleInterop": true,
		"resolveJsonModule": true,
		"incremental": true,
		"declaration": true,
		"sourceMap": true,
		"skipLibCheck": true,
		"outDir": "./dist/"
	},
	"include": ["credentials/**/*", "nodes/**/*", "nodes/**/*.json", "package.json"]
}
```

- [ ] **Step 3: Create `eslint.config.mjs`** at the project root. This is ESLint flat config re-exporting the official n8n community-node ruleset (no `.eslintrc.js`, no gulp — those are the old toolchain).

```js
import { config } from '@n8n/node-cli/eslint';

export default config;
```

- [ ] **Step 4: Create `.prettierrc.js`** at the project root. Every TypeScript file in this plan is already formatted to these settings (tabs, single quotes, printWidth 100).

```js
module.exports = {
	semi: true,
	trailingComma: 'all',
	bracketSpacing: true,
	useTabs: true,
	tabWidth: 2,
	arrowParens: 'always',
	singleQuote: true,
	quoteProps: 'as-needed',
	endOfLine: 'lf',
	printWidth: 100,
};
```

- [ ] **Step 5: Create `.gitignore`** at the project root with exactly these four lines:

```
node_modules
dist
coverage
.tmp
```

- [ ] **Step 6: Create `LICENSE.md`** at the project root with the standard MIT license text:

```
MIT License

Copyright (c) 2026 Hardik Chavda

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 7: Create the icon files.** Create the directory `icons/` at the project root, then create both SVGs. n8n shows `zaple.svg` in its light theme and `zaple.dark.svg` in its dark theme; both node classes (Tasks 4 and 9) reference them as `file:../../icons/zaple.svg` / `file:../../icons/zaple.dark.svg`.

`icons/zaple.svg` (single line, exactly):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="#25D366"/><path fill="#fff" d="M18 17h24v7L29 36h13v7H18v-7l13-12H18z"/></svg>
```

`icons/zaple.dark.svg` (identical except the rect fill color, exactly):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="#1DA851"/><path fill="#fff" d="M18 17h24v7L29 36h13v7H18v-7l13-12H18z"/></svg>
```

- [ ] **Step 8: Attempt to replace the placeholder icons with Zaple's official logo.** Visit https://zaple.ai in a browser, open devtools, and look for an official SVG logo asset (e.g. in the page header or a `/brand` / press-kit page). If a clean, square-ish SVG logo is downloadable, save it over `icons/zaple.svg` (and a dark-background-suitable variant over `icons/zaple.dark.svg`), keeping the exact filenames and ensuring each file is a self-contained `<svg>` with a `viewBox` and no external references. If no official SVG can be obtained, keep the placeholder Z-mark from Step 7 and move on — the placeholder ships in v0.1.0.

- [ ] **Step 9: Install dependencies.** From the project root run:

```
npm install
```

Expected: exit code 0, output ending with a line like `added 500 packages, and audited 501 packages in 40s` (package count and timing vary) and no `ERESOLVE` errors. A `node_modules/` directory and `package-lock.json` now exist. Note that npm 7+ auto-installs `peerDependencies`, so `n8n-workflow` is now available for TypeScript imports.

- [ ] **Step 10: Verify TypeScript config.** Run:

```
npx tsc --noEmit
```

Expected: exit code 0 with no output — there are no `.ts` source files yet (only `package.json` is compiled via `resolveJsonModule`), which is fine. NOTE: `npm run build` and `npm run lint` only become meaningful verification gates from Task 2 onward, when the first source files exist; do not run them as gates in this task.

- [ ] **Step 11: Commit.** Run these two commands from the project root:

```
git add -A
git commit -m "chore: scaffold n8n-nodes-zaple package"
```

Expected: exit code 0, output like `[main <hash>] chore: scaffold n8n-nodes-zaple package` reporting 9 files changed (the 8 created files plus `package-lock.json`; `node_modules/` is excluded by `.gitignore`).

### Task 2: Credential classes

**Files:**
- Create: `credentials/ZapleApi.credentials.ts`
- Create: `credentials/ZapleLeadsApi.credentials.ts`
- Modify: `package.json` (`n8n.credentials` array)
- Test: none (verified by `npm run build` and `npm run lint`; live credential test happens in Task 12)

**Interfaces:**
- Consumes: `package.json` `n8n` block from Task 1 (`"credentials": []`).
- Produces: `export class ZapleApi implements ICredentialType` with `name = 'zapleApi'` from `credentials/ZapleApi.credentials.ts`, and `export class ZapleLeadsApi implements ICredentialType` with `name = 'zapleLeadsApi'` from `credentials/ZapleLeadsApi.credentials.ts`. The string credential names `'zapleApi'` and `'zapleLeadsApi'` are what the Zaple node's `credentials` array references in Task 4 (n8n matches on the `name` property, not the class name).

Background for the executor: in n8n, a "credential type" is a class implementing `ICredentialType` that declares the input fields a user fills in (API key/secret) and HOW those values are injected into requests (`authenticate` — here, as HTTP headers on every request the node makes). Zaple has two separate auth systems, hence two credential classes: the main API uses `Zaple-Api-Key`/`Zaple-Api-Secret` headers, while the Leads API uses `X-Zaple-Api-Key`/`X-Zaple-Api-Secret` (note the `X-` prefix). `ZapleApi` also declares a `test` request — a cheap read-only GET n8n fires when the user clicks "Test" on the credential. `ZapleLeadsApi` has NO `test` block on purpose: the only lead endpoint is a state-creating POST, so there is no safe read-only test.

- [ ] **Step 1: Create `credentials/ZapleApi.credentials.ts`** (create the `credentials/` directory) with exactly this content:

```ts
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZapleApi implements ICredentialType {
	name = 'zapleApi';

	displayName = 'Zaple API';

	documentationUrl = 'https://zaple.ai/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API key from Zaple Settings → API & Developer',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API secret from Zaple Settings → API & Developer',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Zaple-Api-Key': '={{$credentials.apiKey}}',
				'Zaple-Api-Secret': '={{$credentials.apiSecret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.zaple.ai',
			url: '/api/v3/templates?per_page=1',
			method: 'GET',
		},
	};
}
```

- [ ] **Step 2: Create `credentials/ZapleLeadsApi.credentials.ts`** with exactly this content:

```ts
import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZapleLeadsApi implements ICredentialType {
	name = 'zapleLeadsApi';

	displayName = 'Zaple Leads API';

	documentationUrl = 'https://zaple.ai/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'Lead API Key',
			name: 'leadApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Lead API key (zpl_lead_…) from Zaple Leads settings',
		},
		{
			displayName: 'Lead API Secret',
			name: 'leadApiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Lead API secret (zpls_…) shown once at create/rotate time',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Zaple-Api-Key': '={{$credentials.leadApiKey}}',
				'X-Zaple-Api-Secret': '={{$credentials.leadApiSecret}}',
			},
		},
	};
}
```

- [ ] **Step 3: Register both credentials in `package.json`.** n8n only loads credential types listed in the `n8n.credentials` array, and the paths must point at the COMPILED `.js` files under `dist/`. In `package.json`, change this line:

Before:

```json
	"n8n": { "n8nNodesApiVersion": 1, "strict": true, "credentials": [], "nodes": [] },
```

After:

```json
	"n8n": {
		"n8nNodesApiVersion": 1,
		"strict": true,
		"credentials": [
			"dist/credentials/ZapleApi.credentials.js",
			"dist/credentials/ZapleLeadsApi.credentials.js"
		],
		"nodes": []
	},
```

- [ ] **Step 4: Build.** Run:

```
npm run build
```

Expected: exit code 0 and a success message from `n8n-node build` (it compiles TypeScript per `tsconfig.json` into `dist/` and copies static assets). Then verify the compiled credential files exist:

```
ls dist/credentials
```

Expected: the listing includes at minimum `ZapleApi.credentials.js` and `ZapleLeadsApi.credentials.js` (accompanying `.d.ts` and `.js.map` files are also expected).

- [ ] **Step 5: Lint.** Run:

```
npm run lint
```

Expected: exit code 0 with no reported problems (`n8n-node lint` runs ESLint with the official n8n community-node ruleset over the source files).

- [ ] **Step 6: Commit.** Run these two commands:

```
git add -A
git commit -m "feat: add Zaple API and Zaple Leads API credentials"
```

Expected: exit code 0, output like `[main <hash>] feat: add Zaple API and Zaple Leads API credentials` reporting 3 files changed (`credentials/ZapleApi.credentials.ts`, `credentials/ZapleLeadsApi.credentials.ts`, `package.json`; `dist/` is git-ignored).

### Task 3: Shared mappers + preSend functions (TDD)

**Files:**
- Create: `nodes/Zaple/shared/mappers.ts`
- Create: `nodes/Zaple/shared/preSendFunctions.ts`
- Modify: none
- Test: `tests/mappers.test.ts` (written FIRST — TDD)

**Interfaces:**
- Consumes: `npm test` script (`vitest run`) and the `vitest` devDependency from Task 1; `IDataObject`, `IExecuteSingleFunctions`, `IHttpRequestOptions`, `PreSendAction` types from `n8n-workflow` (available because npm auto-installed the peer dependency).
- Produces from `nodes/Zaple/shared/mappers.ts` (pure functions, unit-tested):
  - `buildNumberedFields(prefix: string, values: string[]): IDataObject`
  - `parseJsonObject(raw: string, fieldLabel: string): IDataObject`
  - `parseJsonArray(raw: string, fieldLabel: string): IDataObject[]`
  - `keyValuePairsToObject(pairs: Array<{ key: string; value: string }>): IDataObject`
- Produces from `nodes/Zaple/shared/preSendFunctions.ts` (consumed by resource `index.ts` files in Tasks 4–8 via `import { mapTemplateArguments, mapQuickReplyPayloads } from '../../shared/preSendFunctions';` etc.):
  - `mapTemplateArguments(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapQuickReplyPayloads(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapBatchContacts(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapLeadFields(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapMediaFields(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `sendJsonField(paramName: string, bodyKey: string, label: string, kind: 'object' | 'array'): PreSendAction`

Background for the executor: the Zaple node is "declarative" — operations describe their HTTP requests as metadata (`routing`) instead of imperative code. For API quirks that plain metadata cannot express (e.g. Zaple wants a list of template arguments flattened into numbered body keys `template_argument1`, `template_argument2`, …), n8n runs `preSend` hook functions that receive the outgoing request and may rewrite its body. The hooks themselves need a live n8n execution context (`this: IExecuteSingleFunctions`) and are therefore NOT unit-testable in isolation; the pure data-transforming logic is extracted into `mappers.ts` so it CAN be unit-tested. TDD scope in this task is the mappers ONLY: write the failing test first, then implement. The preSend wrappers are deliberately NOT unit-tested — they are exercised end-to-end against the live API in Task 12.

- [ ] **Step 1: Write the failing test FIRST.** Create the `tests/` directory and `tests/mappers.test.ts` with exactly this content (vitest discovers `tests/**/*.test.ts` by default — no vitest config file is needed, and none should be created):

```ts
import { describe, expect, it } from 'vitest';

import {
	buildNumberedFields,
	keyValuePairsToObject,
	parseJsonArray,
	parseJsonObject,
} from '../nodes/Zaple/shared/mappers';

describe('buildNumberedFields', () => {
	it('returns an empty object for an empty array', () => {
		expect(buildNumberedFields('template_argument', [])).toEqual({});
	});

	it('numbers values starting at 1 with the given prefix', () => {
		expect(buildNumberedFields('template_argument', ['a', 'b'])).toEqual({
			template_argument1: 'a',
			template_argument2: 'b',
		});
	});
});

describe('parseJsonObject', () => {
	it('parses a valid JSON object', () => {
		expect(parseJsonObject('{"a": 1, "b": "two"}', 'Meta (JSON)')).toEqual({ a: 1, b: 'two' });
	});

	it('throws when the input is not valid JSON', () => {
		expect(() => parseJsonObject('{not json', 'Meta (JSON)')).toThrow(/must be valid JSON/);
	});

	it('throws when the input is a JSON array instead of an object', () => {
		expect(() => parseJsonObject('[1, 2]', 'Meta (JSON)')).toThrow(/must be a JSON object/);
	});
});

describe('parseJsonArray', () => {
	it('parses a valid JSON array', () => {
		expect(parseJsonArray('[{"a": 1}, {"b": 2}]', 'Contacts (JSON)')).toEqual([
			{ a: 1 },
			{ b: 2 },
		]);
	});

	it('throws when the input is a JSON object instead of an array', () => {
		expect(() => parseJsonArray('{"a": 1}', 'Contacts (JSON)')).toThrow(/must be a JSON array/);
	});
});

describe('keyValuePairsToObject', () => {
	it('maps key/value pairs to an object', () => {
		expect(
			keyValuePairsToObject([
				{ key: 'city', value: 'Rajkot' },
				{ key: 'plan', value: 'pro' },
			]),
		).toEqual({ city: 'Rajkot', plan: 'pro' });
	});

	it('skips pairs with an empty key', () => {
		expect(
			keyValuePairsToObject([
				{ key: '', value: 'ignored' },
				{ key: 'kept', value: 'yes' },
			]),
		).toEqual({ kept: 'yes' });
	});
});
```

- [ ] **Step 2: Run the test and watch it FAIL** (proves the test actually exercises code that does not exist yet). Run:

```
npm test
```

Expected: exit code 1 with a failure like:

```
 FAIL  tests/mappers.test.ts [ tests/mappers.test.ts ]
Error: Failed to resolve import "../nodes/Zaple/shared/mappers" from "tests/mappers.test.ts". Does the file exist?
 Test Files  1 failed (1)
```

If `npm test` PASSES at this point, stop — something is wrong (the module cannot exist yet).

- [ ] **Step 3: Implement the mappers.** Create the directories `nodes/Zaple/shared/` and the file `nodes/Zaple/shared/mappers.ts` with exactly this content:

```ts
import type { IDataObject } from 'n8n-workflow';

export function buildNumberedFields(prefix: string, values: string[]): IDataObject {
	const out: IDataObject = {};
	values.forEach((value, index) => {
		out[`${prefix}${index + 1}`] = value;
	});
	return out;
}

export function parseJsonObject(raw: string, fieldLabel: string): IDataObject {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`${fieldLabel} must be valid JSON`);
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(`${fieldLabel} must be a JSON object`);
	}
	return parsed as IDataObject;
}

export function parseJsonArray(raw: string, fieldLabel: string): IDataObject[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`${fieldLabel} must be valid JSON`);
	}
	if (!Array.isArray(parsed)) {
		throw new Error(`${fieldLabel} must be a JSON array`);
	}
	return parsed as IDataObject[];
}

export function keyValuePairsToObject(pairs: Array<{ key: string; value: string }>): IDataObject {
	const out: IDataObject = {};
	for (const pair of pairs) {
		if (pair.key) out[pair.key] = pair.value;
	}
	return out;
}
```

- [ ] **Step 4: Run the test and watch it PASS.** Run:

```
npm test
```

Expected: exit code 0 with output like:

```
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Step 5: Create the preSend functions.** Create `nodes/Zaple/shared/preSendFunctions.ts` with exactly this content. These are the n8n-context wrappers around the mappers: each reads node parameters via `this.getNodeParameter(...)` and merges derived keys into the outgoing request body. They are NOT unit-tested — they require a live n8n execution context (`this: IExecuteSingleFunctions`), so they are covered by the live API testing in Task 12 instead. Do NOT write unit tests for them.

```ts
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	PreSendAction,
} from 'n8n-workflow';

import {
	buildNumberedFields,
	keyValuePairsToObject,
	parseJsonArray,
	parseJsonObject,
} from './mappers';

function mergeBody(requestOptions: IHttpRequestOptions, extra: IDataObject): void {
	requestOptions.body = { ...((requestOptions.body as IDataObject) ?? {}), ...extra };
}

export async function mapTemplateArguments(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const args = this.getNodeParameter('templateArguments', []) as string[];
	if (args.length) mergeBody(requestOptions, buildNumberedFields('template_argument', args));
	return requestOptions;
}

export async function mapQuickReplyPayloads(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const payloads = this.getNodeParameter('quickReplyPayloads', []) as string[];
	if (payloads.length) mergeBody(requestOptions, buildNumberedFields('quick_reply_payload', payloads));
	return requestOptions;
}

export async function mapBatchContacts(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const inputMode = this.getNodeParameter('inputMode', 'ui') as string;
	if (inputMode === 'json') {
		const raw = this.getNodeParameter('contactsJson', '[]') as string;
		mergeBody(requestOptions, { contacts: parseJsonArray(raw, 'Contacts (JSON)') });
		return requestOptions;
	}
	const contactsUi = this.getNodeParameter('contactsUi', {}) as {
		contact?: Array<{ countryCode: string; phoneNumber: string; name?: string }>;
	};
	const contacts = (contactsUi.contact ?? []).map((c) => ({
		country_code: c.countryCode,
		phone_number: c.phoneNumber,
		...(c.name ? { name: c.name } : {}),
	}));
	mergeBody(requestOptions, { contacts });
	return requestOptions;
}

export async function mapLeadFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	if (typeof additionalFields.metaJson === 'string' && additionalFields.metaJson.trim() !== '') {
		mergeBody(requestOptions, { meta: parseJsonObject(additionalFields.metaJson, 'Meta (JSON)') });
	}
	const customFieldsMode = this.getNodeParameter('customFieldsMode', 'none') as string;
	if (customFieldsMode === 'json') {
		const raw = this.getNodeParameter('customFieldsJson', '{}') as string;
		mergeBody(requestOptions, { custom_fields: parseJsonObject(raw, 'Custom Fields (JSON)') });
	} else if (customFieldsMode === 'ui') {
		const customFieldsUi = this.getNodeParameter('customFieldsUi', {}) as {
			field?: Array<{ key: string; value: string }>;
		};
		const fields = keyValuePairsToObject(customFieldsUi.field ?? []);
		if (Object.keys(fields).length) mergeBody(requestOptions, { custom_fields: fields });
	}
	return requestOptions;
}

export async function mapMediaFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const mediaUrlType = this.getNodeParameter('mediaUrlType', 'none') as string;
	if (mediaUrlType === 'none') return requestOptions;
	const extra: IDataObject = { media_url_type: mediaUrlType };
	if (mediaUrlType === 'public_url') {
		extra.media_url = this.getNodeParameter('mediaUrl', '') as string;
	}
	if (mediaUrlType === 'base64') {
		extra.base64 = this.getNodeParameter('base64Data', '') as string;
	}
	const fileName = this.getNodeParameter('fileName', '') as string;
	if (fileName) extra.file_name = fileName;
	mergeBody(requestOptions, extra);
	return requestOptions;
}

export function sendJsonField(
	paramName: string,
	bodyKey: string,
	label: string,
	kind: 'object' | 'array',
): PreSendAction {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = this.getNodeParameter(paramName, '') as string;
		if (raw && raw.trim() !== '') {
			mergeBody(requestOptions, {
				[bodyKey]:
					kind === 'object' ? parseJsonObject(raw, label) : parseJsonArray(raw, label),
			});
		}
		return requestOptions;
	};
}
```

- [ ] **Step 6: Build and lint.** Run each command and confirm exit code 0:

```
npm run build
```

Expected: exit code 0; `dist/nodes/Zaple/shared/mappers.js` and `dist/nodes/Zaple/shared/preSendFunctions.js` now exist (verify with `ls dist/nodes/Zaple/shared`).

```
npm run lint
```

Expected: exit code 0 with no reported problems.

- [ ] **Step 7: Commit.** Run these two commands:

```
git add -A
git commit -m "feat: add shared mappers and preSend functions with tests"
```

Expected: exit code 0, output like `[main <hash>] feat: add shared mappers and preSend functions with tests` reporting 3 files changed (`tests/mappers.test.ts`, `nodes/Zaple/shared/mappers.ts`, `nodes/Zaple/shared/preSendFunctions.ts`).


### Task 4: Zaple node shell + Message resource

**Files:**
- Create: `nodes/Zaple/resources/message/getStatus.ts`
- Create: `nodes/Zaple/resources/message/getCount.ts`
- Create: `nodes/Zaple/resources/message/sendTemplate.ts`
- Create: `nodes/Zaple/resources/message/sendService.ts`
- Create: `nodes/Zaple/resources/message/index.ts`
- Create: `nodes/Zaple/Zaple.node.ts`
- Modify: `package.json` (register the compiled node under the `n8n.nodes` array)
- Test: none new — this task is declarative n8n metadata, which the contract verifies via `npm run build` + `npm run lint` (and live API testing in Task 12). The existing `tests/mappers.test.ts` from Task 3 must stay green (`npm test`).

**Interfaces:**
- Consumes (from Task 3, module `nodes/Zaple/shared/preSendFunctions.ts`, imported in `nodes/Zaple/resources/message/index.ts` via the exact path `'../../shared/preSendFunctions'`):
  - `mapTemplateArguments(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapQuickReplyPayloads(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
  - `mapMediaFields(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>`
- Consumes (from Task 2): the credential classes `zapleApi` and `zapleLeadsApi` referenced by name in the node's `credentials` block.
- Produces:
  - `messageDescription: INodeProperties[]` from `nodes/Zaple/resources/message/index.ts`
  - `messageSendTemplateFields: INodeProperties[]` from `nodes/Zaple/resources/message/sendTemplate.ts`
  - `messageSendServiceFields: INodeProperties[]` from `nodes/Zaple/resources/message/sendService.ts`
  - `messageGetStatusFields: INodeProperties[]` from `nodes/Zaple/resources/message/getStatus.ts`
  - `messageGetCountFields: INodeProperties[]` from `nodes/Zaple/resources/message/getCount.ts`
  - `export class Zaple implements INodeType` in `nodes/Zaple/Zaple.node.ts` — the node shell that Tasks 5–8 modify. Each of those tasks edits exactly three anchor lines in this file (adding its own import, resource option, and spread, keeping each list alphabetized):
    - Anchor 1 — the import block. Task 4 leaves exactly one resource import; Tasks 5–8 each insert their own `import { <resource>Description } from './resources/<resource>';` line so the block ends up alphabetized (batch, catalog, lead, message, template):
      ```ts
      import { messageDescription } from './resources/message';
      ```
    - Anchor 2 — the Resource options array (inside `properties`). Tasks 5–8 each insert `{ name: '<Resource>', value: '<resource>' },` keeping options alphabetized by `name`; `default: 'message'` never changes:
      ```ts
      				options: [{ name: 'Message', value: 'message' }],
      ```
    - Anchor 3 — the description spreads at the end of `properties`. Tasks 5–8 each add `...<resource>Description,` keeping the spreads alphabetized:
      ```ts
      			...messageDescription,
      ```

Background for the executor (no n8n knowledge assumed): an n8n *declarative* node contains no request code. It is a single class with a `description` object; n8n's engine reads `routing` metadata off the selected operation option (HTTP method + URL) and off each visible field (`routing.send` says "put this field's value into the JSON body / query string under this key") and builds the HTTP request itself. `displayOptions.show` controls which fields are visible for which resource/operation combination — a hidden field is not sent. `preSend` functions (built in Task 3) are hooks that run just before the request to build body keys the flat routing metadata cannot express (numbered keys like `template_argument1..N`, conditional media keys). This task builds the Message resource of the Zaple node (WhatsApp Business messaging API, base URL `https://app.zaple.ai`) and the node shell that later tasks extend.

- [ ] **Step 1: Create the Message resource directory**

Run from the project root `G:\Hardik Project\zaple-n8n`:

PowerShell:

```powershell
New-Item -ItemType Directory -Force "nodes\Zaple\resources\message"
```

(bash equivalent: `mkdir -p nodes/Zaple/resources/message`)

Expected output: a directory listing line ending in `message`; the directory `nodes/Zaple/resources/message` now exists.

- [ ] **Step 2: Create `nodes/Zaple/resources/message/getStatus.ts`**

This is the contract's canonical "simple GET with query param" example, copied verbatim. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const messageGetStatusFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID returned when the message was sent',
		displayOptions: { show: { resource: ['message'], operation: ['getStatus'] } },
		routing: { send: { type: 'query', property: 'message_id' } },
	},
];
```

- [ ] **Step 3: Create `nodes/Zaple/resources/message/getCount.ts`**

`GET /api/v2/message-count` takes two optional query params, so they live in a `collection` named `filters` (n8n renders a collection as an "Add Filter" dropdown; sub-options inherit the parent's `displayOptions` and carry their own `routing`). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const messageGetCountFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['message'], operation: ['getCount'] } },
		options: [
			{
				displayName: 'From Date',
				name: 'fromDate',
				type: 'string',
				default: '',
				placeholder: 'yyyy-mm-dd hh:mm:ss',
				description: 'Start of the date range to count messages in',
				routing: { send: { type: 'query', property: 'from_date' } },
			},
			{
				displayName: 'To Date',
				name: 'toDate',
				type: 'string',
				default: '',
				placeholder: 'yyyy-mm-dd hh:mm:ss',
				description: 'End of the date range to count messages in',
				routing: { send: { type: 'query', property: 'to_date' } },
			},
		],
	},
];
```

- [ ] **Step 4: Create `nodes/Zaple/resources/message/sendTemplate.ts`**

Fields for `POST /api/v3/send-template-message`. Note three conventions at work (all binding, from the contract):
- Simple scalar fields carry `routing: { send: { type: 'body', property: '<snake_case>' } }` — n8n puts the value into the JSON body under that key.
- `templateArguments` and `quickReplyPayloads` are multi-value string lists with **NO routing**: the Task 3 preSend functions (`mapTemplateArguments`, `mapQuickReplyPayloads`, wired in `index.ts` in Step 6) read them and write numbered body keys `template_argument1..N` / `quick_reply_payload1..N`.
- Media fields (`mediaUrlType`/`mediaUrl`/`base64Data`/`fileName`) carry **NO routing** either — `mapMediaFields` builds `media_url_type`, `media_url`/`base64`, and `file_name` in the body.

Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const messageSendTemplateFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier, as shown in the Zaple template library — NOT the numeric database ID',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 91',
		description: 'Recipient country calling code without the + sign, e.g. 91 for India',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
		routing: { send: { type: 'body', property: 'country_code' } },
	},
	{
		displayName: 'Send To',
		name: 'sendTo',
		type: 'string',
		required: true,
		default: '',
		description: 'Recipient phone number without the country code',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
		routing: { send: { type: 'body', property: 'send_to' } },
	},
	{
		displayName: 'Template Arguments',
		name: 'templateArguments',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Argument' },
		default: [],
		description: 'Values for {{1}}, {{2}}, … in order — sent as template_argument1..N',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
	},
	{
		displayName: 'Quick Reply Payloads',
		name: 'quickReplyPayloads',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Payload' },
		default: [],
		description:
			'Payload values for the quick-reply buttons in button order — sent as quick_reply_payload1..N',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
	},
	{
		displayName: 'Media URL Type',
		name: 'mediaUrlType',
		type: 'options',
		options: [
			{ name: 'Base64', value: 'base64' },
			{ name: 'None', value: 'none' },
			{ name: 'Public URL', value: 'public_url' },
		],
		default: 'none',
		description: 'How the media for the template header is provided',
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
	},
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		type: 'string',
		default: '',
		description: 'Publicly accessible URL of the media file',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendTemplate'], mediaUrlType: ['public_url'] },
		},
	},
	{
		displayName: 'Base64 Data',
		name: 'base64Data',
		type: 'string',
		default: '',
		description:
			'Base64-encoded content of the media file, e.g. {{ $binary.data.data }} from a previous node',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendTemplate'], mediaUrlType: ['base64'] },
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description: 'File name shown to the recipient — used for document media',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendTemplate'],
				mediaUrlType: ['base64', 'public_url'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
		options: [
			{
				displayName: 'Biz Opaque Callback Data',
				name: 'bizOpaqueCallbackData',
				type: 'string',
				default: '',
				description: 'Stringified JSON echoed back in status webhooks',
				routing: { send: { type: 'body', property: 'biz_opaque_callback_data' } },
			},
			{
				displayName: 'Header Argument',
				name: 'headerArgument',
				type: 'string',
				default: '',
				description: 'Dynamic text value for the template header',
				routing: { send: { type: 'body', property: 'header_argument' } },
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Tag' },
				default: [],
				description: 'Tags attached to the message for filtering and reporting',
				routing: { send: { type: 'body', property: 'tags' } },
			},
		],
	},
];
```

(Option lists are alphabetized by `name`/`displayName` — Base64/None/Public URL, and Biz Opaque Callback Data/Header Argument/Tags — because the n8n linter enforces sorted options.)

- [ ] **Step 5: Create `nodes/Zaple/resources/message/sendService.ts`**

Fields for `POST /api/v2/send-service-message` (free-form message inside WhatsApp's 24-hour customer-service window). The `type` field switches which other fields are visible via `displayOptions.show.type`. The media fields follow the same no-routing convention as Step 4 (`mapMediaFields` handles them); `templateArguments` is again handled by `mapTemplateArguments`. Location fields route flat into the body — the Zaple docs are ambiguous on flat-vs-nested location payloads, which Task 12 resolves against the live API (the ambiguity is also noted in the Latitude field description so node users see it). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const messageSendServiceFields: INodeProperties[] = [
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 91',
		description: 'Recipient country calling code without the + sign, e.g. 91 for India',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'country_code' } },
	},
	{
		displayName: 'Send To',
		name: 'sendTo',
		type: 'string',
		required: true,
		default: '',
		description: 'Recipient phone number without the country code',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'send_to' } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Audio', value: 'audio' },
			{ name: 'Document', value: 'document' },
			{ name: 'Image', value: 'image' },
			{ name: 'Location', value: 'location' },
			{ name: 'Text', value: 'text' },
			{ name: 'Video', value: 'video' },
		],
		default: 'text',
		description: 'Type of service message to send',
		displayOptions: { show: { resource: ['message'], operation: ['sendService'] } },
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		description: 'Message text or media caption',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['image', 'text', 'video'] },
		},
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Media URL Type',
		name: 'mediaUrlType',
		type: 'options',
		options: [
			{ name: 'Base64', value: 'base64' },
			{ name: 'None', value: 'none' },
			{ name: 'Public URL', value: 'public_url' },
		],
		default: 'none',
		description: 'How the media file is provided',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
			},
		},
	},
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		type: 'string',
		default: '',
		description: 'Publicly accessible URL of the media file',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['public_url'],
			},
		},
	},
	{
		displayName: 'Base64 Data',
		name: 'base64Data',
		type: 'string',
		default: '',
		description:
			'Base64-encoded content of the media file, e.g. {{ $binary.data.data }} from a previous node',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['base64'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description: 'File name shown to the recipient — used for document media',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendService'],
				type: ['audio', 'document', 'image', 'video'],
				mediaUrlType: ['base64', 'public_url'],
			},
		},
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		description:
			'Required for document messages: send-API identifier of a template configured with a document header',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['document'] },
		},
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Template Arguments',
		name: 'templateArguments',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Argument' },
		default: [],
		description:
			'Values for {{1}}, {{2}}, … in the document template — sent as template_argument1..N',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['document'] },
		},
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 19.0760',
		description:
			'Latitude of the location. Note: the Zaple docs are ambiguous about flat vs nested location payloads — the flat body shape used here is verified against the live API in Task 12.',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'latitude' } },
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 72.8777',
		description: 'Longitude of the location',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'longitude' } },
	},
	{
		displayName: 'Location Name',
		name: 'locationName',
		type: 'string',
		default: '',
		description: 'Name of the place shown above the address',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Human-readable address of the location',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendService'], type: ['location'] },
		},
		routing: { send: { type: 'body', property: 'address' } },
	},
];
```

- [ ] **Step 6: Create `nodes/Zaple/resources/message/index.ts`**

This assembles the resource: one `Operation` options property (each option carries the HTTP method + URL in `routing.request`, and where needed the Task 3 preSend hooks in `routing.send.preSend`), followed by spreads of the four field arrays. Options are alphabetized by `name`; every option has `action` and `description` (n8n linter requirements). Note the preSend lists: `sendService` uses `[mapMediaFields, mapTemplateArguments]`; `sendTemplate` uses `[mapTemplateArguments, mapQuickReplyPayloads, mapMediaFields]`. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

import {
	mapMediaFields,
	mapQuickReplyPayloads,
	mapTemplateArguments,
} from '../../shared/preSendFunctions';
import { messageGetCountFields } from './getCount';
import { messageGetStatusFields } from './getStatus';
import { messageSendServiceFields } from './sendService';
import { messageSendTemplateFields } from './sendTemplate';

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Get Message Count',
				value: 'getCount',
				action: 'Get message count',
				description: 'Get sent/read message counts for a date range',
				routing: { request: { method: 'GET', url: '/api/v2/message-count' } },
			},
			{
				name: 'Get Message Status',
				value: 'getStatus',
				action: 'Get message status',
				description: 'Get the delivery status of a sent message by its message ID',
				routing: { request: { method: 'GET', url: '/api/v2/message-status' } },
			},
			{
				name: 'Send Service Message',
				value: 'sendService',
				action: 'Send a service message',
				description: 'Send a free-form message inside the 24-hour customer service window',
				routing: {
					request: { method: 'POST', url: '/api/v2/send-service-message' },
					send: { preSend: [mapMediaFields, mapTemplateArguments] },
				},
			},
			{
				name: 'Send Template Message',
				value: 'sendTemplate',
				action: 'Send a template message',
				description: 'Send a pre-approved WhatsApp template message',
				routing: {
					request: { method: 'POST', url: '/api/v3/send-template-message' },
					send: { preSend: [mapTemplateArguments, mapQuickReplyPayloads, mapMediaFields] },
				},
			},
		],
		default: 'sendTemplate',
	},
	...messageGetCountFields,
	...messageGetStatusFields,
	...messageSendServiceFields,
	...messageSendTemplateFields,
];
```

- [ ] **Step 7: Create `nodes/Zaple/Zaple.node.ts` (the node shell — Message resource only at this stage)**

This is the contract's node shell, but with ONLY the Message resource wired in: one resource import, one entry in the Resource options list, one description spread. **Tasks 5–8 each add their own import + resource option + spread to this file** (Task 5: template, Task 6: batch, Task 7: lead, Task 8: catalog — see the three anchor lines in this task's Interfaces block; every list stays alphabetized and `default: 'message'` is never changed).

The `credentials` block below is the contract's FULL block and is copied as-is, **including the `zapleLeadsApi` entry and all five resource names** — it already anticipates every resource, so Tasks 5–8 do NOT touch it. Referencing not-yet-existing resource values in `displayOptions` is harmless: those conditions simply never match until the resource exists.

Full file contents:

```ts
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { messageDescription } from './resources/message';

export class Zaple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple',
		name: 'zaple',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Zaple.ai WhatsApp Business API',
		defaults: { name: 'Zaple' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zapleApi',
				required: true,
				displayOptions: { show: { resource: ['message', 'template', 'batch', 'catalog'] } },
			},
			{
				name: 'zapleLeadsApi',
				required: true,
				displayOptions: { show: { resource: ['lead'] } },
			},
		],
		requestDefaults: {
			baseURL: 'https://app.zaple.ai',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Message', value: 'message' }],
				default: 'message',
			},
			...messageDescription,
		],
	};
}
```

- [ ] **Step 8: Modify `package.json` — register the compiled node**

n8n discovers nodes through the `n8n.nodes` array of compiled `.js` paths. Task 1 created the `n8n` block with `"nodes": []` and Task 2 filled `credentials`. Change ONLY the `nodes` array (keep everything else in `package.json` untouched, and match the file's existing indentation).

Before:

```json
	"n8n": {
		"n8nNodesApiVersion": 1,
		"strict": true,
		"credentials": [
			"dist/credentials/ZapleApi.credentials.js",
			"dist/credentials/ZapleLeadsApi.credentials.js"
		],
		"nodes": []
	}
```

After:

```json
	"n8n": {
		"n8nNodesApiVersion": 1,
		"strict": true,
		"credentials": [
			"dist/credentials/ZapleApi.credentials.js",
			"dist/credentials/ZapleLeadsApi.credentials.js"
		],
		"nodes": [
			"dist/nodes/Zaple/Zaple.node.js"
		]
	}
```

(Task 9 later appends `"dist/nodes/ZapleTrigger/ZapleTrigger.node.js"` to this array.)

- [ ] **Step 9: Build**

Run from the project root:

```powershell
npm run build
```

Expected output: `n8n-node build` compiles TypeScript and exits with code 0 (no TS errors). Verify the compiled node exists:

```powershell
node -e "console.log(require('fs').existsSync('dist/nodes/Zaple/Zaple.node.js'))"
```

Expected output:

```
true
```

- [ ] **Step 10: Lint**

```powershell
npm run lint
```

Expected output: `n8n-node lint` (ESLint with n8n community-node rules) reports no errors and exits with code 0. If it reports unsorted-options or missing-description errors, fix the flagged property in place — the code above is written to satisfy the alphabetization and `action`/`description` rules.

- [ ] **Step 11: Confirm existing unit tests still pass**

```powershell
npm test
```

Expected output: vitest runs the Task 3 suite and exits 0, with a summary containing:

```
 ✓ tests/mappers.test.ts
 Test Files  1 passed (1)
```

(No new tests in this task — declarative metadata is not unit-tested per the contract; it is verified by build + lint here and live API testing in Task 12.)

- [ ] **Step 12: Commit**

```powershell
git add package.json nodes/Zaple/Zaple.node.ts nodes/Zaple/resources/message
git commit -m "feat: add Zaple node with Message resource"
```

Expected output: a line like `[main <shorthash>] feat: add Zaple node with Message resource` followed by `7 files changed` (6 new files + `package.json`).


### Task 5: Template resource (8 operations)

**Files:**
- Create: `nodes/Zaple/resources/template/index.ts`
- Create: `nodes/Zaple/resources/template/list.ts`
- Create: `nodes/Zaple/resources/template/get.ts`
- Create: `nodes/Zaple/resources/template/preview.ts`
- Create: `nodes/Zaple/resources/template/create.ts`
- Create: `nodes/Zaple/resources/template/update.ts`
- Create: `nodes/Zaple/resources/template/checkStatus.ts`
- Create: `nodes/Zaple/resources/template/setActive.ts`
- Create: `nodes/Zaple/resources/template/del.ts`
- Modify: `nodes/Zaple/Zaple.node.ts`
- Test: none (declarative metadata is verified by `npm run build` + `npm run lint` now, and live against the real API in Task 12 — do NOT invent unit tests for it)

**Interfaces:**
- Consumes: `sendJsonField(paramName: string, bodyKey: string, label: string, kind: 'object' | 'array'): PreSendAction` exported from `nodes/Zaple/shared/preSendFunctions.ts` (Task 3); the `nodes/Zaple/Zaple.node.ts` shell from Task 4, which at this point wires ONLY the Message resource (one `messageDescription` import, one `{ name: 'Message', value: 'message' }` resource option, one `...messageDescription` spread — these are the edit anchors below).
- Produces: `export const templateDescription: INodeProperties[]` from `nodes/Zaple/resources/template/index.ts` (spread into `Zaple.node.ts` in this task); the eight per-operation field arrays `templateListFields`, `templateGetFields`, `templatePreviewFields`, `templateCreateFields`, `templateUpdateFields`, `templateCheckStatusFields`, `templateSetActiveFields`, `templateDeleteFields` (each `INodeProperties[]`), consumed only by this resource's own `index.ts`.

Background for the executor: a "template" is a pre-approved WhatsApp message layout that Meta reviews before it can be sent. This task adds the Template resource to the declarative Zaple node: each operation is an entry in an `Operation` options property carrying `routing.request` (HTTP method + URL), and each operation's input fields live in their own file, self-routing their values into the request body or query string via `routing.send`. CRITICAL API QUIRK — the Zaple API uses the name `template_id` for THREE DIFFERENT identifiers depending on the endpoint: (1) the **send-API identifier** (a long numeric string used when sending messages — wanted by Get, Preview, and Check Status), (2) the **numeric database ID** (an integer returned by Create — wanted by Update and Delete), and (3) the **template name identifier** (the template's name string — wanted by Activate/Deactivate). Passing the wrong kind fails silently or hits the wrong template, so every ID field's description below explicitly states which one it wants. Do not "simplify" or merge these fields. Get and Preview put the ID in the URL path via an n8n expression URL (`'=/api/v3/template/{{$parameter.templateId}}'` — the leading `=` marks the string as an expression, and `{{$parameter.templateId}}` is resolved at runtime from the node parameter), so their `templateId` fields deliberately have NO `routing.send`. Create and Update accept two complex JSON inputs (`buttons` array, `templateLocation` object) that plain routing metadata cannot validate, so those two operations attach `preSend` hooks built by the `sendJsonField` factory from Task 3: the parameters `buttonsJson` / `templateLocationJson` carry NO routing of their own, and the hooks parse + merge them into the body at request time (skipping them when empty).

- [ ] **Step 1: Create `nodes/Zaple/resources/template/get.ts`.** Create the directory `nodes/Zaple/resources/template/` first. The `templateId` here is the SEND-API identifier and is consumed by the operation's expression URL, so the field has no `routing.send`:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateGetFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier (the long numeric ID used for sending), NOT the database ID',
		displayOptions: { show: { resource: ['template'], operation: ['get'] } },
	},
];
```

- [ ] **Step 2: Create `nodes/Zaple/resources/template/preview.ts`.** Same send-API identifier pattern as Get (path parameter — no `routing.send`):

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templatePreviewFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier (the long numeric ID used for sending), NOT the database ID',
		displayOptions: { show: { resource: ['template'], operation: ['preview'] } },
	},
];
```

- [ ] **Step 3: Create `nodes/Zaple/resources/template/checkStatus.ts`.** Also the send-API identifier, but this endpoint takes it as a QUERY parameter, so the field routes itself:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateCheckStatusFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier (the long numeric ID used for sending), NOT the database ID',
		displayOptions: { show: { resource: ['template'], operation: ['checkStatus'] } },
		routing: { send: { type: 'query', property: 'template_id' } },
	},
];
```

- [ ] **Step 4: Create `nodes/Zaple/resources/template/setActive.ts`.** Activation addresses the template by its NAME identifier (the third meaning of `template_id`), sent in the body together with `activation_status` (`"1"` = activate, `"0"` = deactivate — string values, exactly as the API expects):

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateSetActiveFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description: 'Template name identifier — the template name as shown in Zaple, NOT a numeric ID',
		displayOptions: { show: { resource: ['template'], operation: ['setActive'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Activation Status',
		name: 'activationStatus',
		type: 'options',
		options: [
			{ name: 'Activate', value: '1' },
			{ name: 'Deactivate', value: '0' },
		],
		default: '1',
		description: 'Whether to activate or deactivate the template',
		displayOptions: { show: { resource: ['template'], operation: ['setActive'] } },
		routing: { send: { type: 'body', property: 'activation_status' } },
	},
];
```

- [ ] **Step 5: Create `nodes/Zaple/resources/template/del.ts`.** The file is named `del.ts` (not `delete.ts`) per the binding file tree, but the exported constant is `templateDeleteFields` and the operation value is `delete`. Delete wants the NUMERIC DATABASE ID (an integer):

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateDeleteFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'number',
		required: true,
		default: 0,
		description:
			'Numeric database ID — NOT the send-API identifier. Templates used by active scheduled broadcasts cannot be deleted.',
		displayOptions: { show: { resource: ['template'], operation: ['delete'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
];
```

- [ ] **Step 6: Create `nodes/Zaple/resources/template/list.ts`.** All list filters are optional, so they live in a single `filters` collection; each sub-option routes itself into the query string. Note `perPage` maps to the snake_case query key `per_page`. Collection options are alphabetized by `displayName` (n8n linter requirement):

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateListFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['template'], operation: ['list'] } },
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether to return only active (true) or only inactive (false) templates',
				routing: { send: { type: 'query', property: 'active' } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Authentication', value: 'AUTHENTICATION' },
					{ name: 'Carousel', value: 'CAROUSEL' },
					{ name: 'Marketing', value: 'MARKETING' },
					{ name: 'Utility', value: 'UTILITY' },
				],
				default: 'MARKETING',
				description: 'Return only templates in this category',
				routing: { send: { type: 'query', property: 'category' } },
			},
			{
				displayName: 'Favorite',
				name: 'favorite',
				type: 'boolean',
				default: true,
				description: 'Whether to return only templates marked as favorite',
				routing: { send: { type: 'query', property: 'favorite' } },
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number of the result set to return',
				routing: { send: { type: 'query', property: 'page' } },
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				default: 50,
				description: 'Number of templates to return per page',
				routing: { send: { type: 'query', property: 'per_page' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search over template names',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Approved', value: 'APPROVED' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Rejected', value: 'REJECTED' },
				],
				default: 'APPROVED',
				description: 'Return only templates with this approval status',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
```

- [ ] **Step 7: Create `nodes/Zaple/resources/template/create.ts`.** Note the mixed key casing is EXACTLY what the Zaple create-template API expects: camelCase body keys (`contentType`, `headerText`, `templateImage`, …) alongside snake_case ones (`variable_type`, `variable_samples`) — do not normalize them. `content` is deliberately NOT `required: true` because authentication templates have no free-form body. `buttonsJson` and `templateLocationJson` carry NO routing — the `sendJsonField` preSend hooks wired in `index.ts` (Step 9) parse and merge them into the body as `buttons` / `templateLocation`:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateCreateFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Template title (max 255 characters)',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'title' } },
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Authentication',
				value: 'authentication',
				description: 'One-time passcodes and identity verification messages',
			},
			{
				name: 'Marketing',
				value: 'marketing',
				description: 'Promotions, offers, and announcements',
			},
			{
				name: 'Utility',
				value: 'utility',
				description: 'Transactional updates about an existing order or account',
			},
			{
				name: 'Utility Marketing',
				value: 'utility_marketing',
				description: 'Utility template that also includes marketing content',
			},
		],
		default: 'utility',
		description: 'WhatsApp template category',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'category' } },
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		required: true,
		default: 'en_US',
		description: 'Template language code, for example en_US',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'language' } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description:
			'Body text; use {{1}}, {{2}} or named variables. Not required for authentication templates.',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'Buttons (JSON)',
		name: 'buttonsJson',
		type: 'json',
		default: '',
		description:
			'JSON array of buttons, for example: [{"type":"quick_reply","replies":[{"text":"Yes"}]},{"type":"url","websites":[{"text":"Visit","url":"https://example.com"}]}]',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
	},
	{
		displayName: 'Template Location (JSON)',
		name: 'templateLocationJson',
		type: 'json',
		default: '',
		description:
			'JSON object for a location header, for example: {"name":"Head Office","address":"123 Main St","latitude":"22.30","longitude":"70.80"}',
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['template'], operation: ['create'] } },
		options: [
			{
				displayName: 'Add Security Recommendation',
				name: 'addSecurityRecommendation',
				type: 'boolean',
				default: false,
				description:
					'Whether to add the security recommendation line (authentication templates only)',
				routing: { send: { type: 'body', property: 'addSecurityRecommendation' } },
			},
			{
				displayName: 'Code Expiration Minutes',
				name: 'codeExpirationMinutes',
				type: 'number',
				default: 10,
				description: 'Minutes until the one-time code expires (authentication templates only)',
				routing: { send: { type: 'body', property: 'codeExpirationMinutes' } },
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'Image', value: 'image' },
					{ name: 'Location', value: 'location' },
					{ name: 'None', value: 'none' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
				default: 'none',
				description: 'Type of the template header',
				routing: { send: { type: 'body', property: 'contentType' } },
			},
			{
				displayName: 'Copy OTP Button Text',
				name: 'copyOtpButtonText',
				type: 'string',
				default: '',
				description: 'Label of the copy-code button (authentication templates only)',
				routing: { send: { type: 'body', property: 'copyOtpButtonText' } },
			},
			{
				displayName: 'Enable Code Expiration',
				name: 'enableCodeExpiration',
				type: 'boolean',
				default: false,
				description: 'Whether the one-time code expires (authentication templates only)',
				routing: { send: { type: 'body', property: 'enableCodeExpiration' } },
			},
			{
				displayName: 'Footer Text',
				name: 'footerText',
				type: 'string',
				default: '',
				description: 'Footer text shown below the template body',
				routing: { send: { type: 'body', property: 'footerText' } },
			},
			{
				displayName: 'Header Text',
				name: 'headerText',
				type: 'string',
				default: '',
				description: 'Header text (max 60 characters); used when Content Type is Text',
				routing: { send: { type: 'body', property: 'headerText' } },
			},
			{
				displayName: 'Template Document',
				name: 'templateDocument',
				type: 'string',
				default: '',
				description: 'PDF URL for the document header',
				routing: { send: { type: 'body', property: 'templateDocument' } },
			},
			{
				displayName: 'Template Image',
				name: 'templateImage',
				type: 'string',
				default: '',
				description: 'Public URL or base64 data URI of the header image',
				routing: { send: { type: 'body', property: 'templateImage' } },
			},
			{
				displayName: 'Template Video',
				name: 'templateVideo',
				type: 'string',
				default: '',
				description: 'Public URL or base64 data URI of the header video',
				routing: { send: { type: 'body', property: 'templateVideo' } },
			},
			{
				displayName: 'Variable Samples',
				name: 'variableSamples',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Sample' },
				default: [],
				description: 'Example values for the template variables, in order (used by Meta review)',
				routing: { send: { type: 'body', property: 'variable_samples' } },
			},
			{
				displayName: 'Variable Type',
				name: 'variableType',
				type: 'options',
				options: [
					{ name: 'Named', value: 'named' },
					{ name: 'Numeric', value: 'numeric' },
				],
				default: 'numeric',
				description: 'Style of body variables: numbered ({{1}}) or named ({{name}})',
				routing: { send: { type: 'body', property: 'variable_type' } },
			},
		],
	},
];
```

- [ ] **Step 8: Create `nodes/Zaple/resources/template/update.ts`.** Update wants the NUMERIC DATABASE ID in the body, and unlike Create it REQUIRES `title`, `category`, `language`, `contentType` (only `text`/`image`/`video` are valid here), and `content`. Because `contentType` is a required top-level field for Update, it is NOT repeated inside Additional Fields (that is the only difference from Create's Additional Fields):

```ts
import type { INodeProperties } from 'n8n-workflow';

export const templateUpdateFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'number',
		required: true,
		default: 0,
		description: 'Numeric database ID, as returned by Create — NOT the send-API identifier',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Template title (max 255 characters)',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'title' } },
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Authentication',
				value: 'authentication',
				description: 'One-time passcodes and identity verification messages',
			},
			{
				name: 'Marketing',
				value: 'marketing',
				description: 'Promotions, offers, and announcements',
			},
			{
				name: 'Utility',
				value: 'utility',
				description: 'Transactional updates about an existing order or account',
			},
			{
				name: 'Utility Marketing',
				value: 'utility_marketing',
				description: 'Utility template that also includes marketing content',
			},
		],
		default: 'utility',
		description: 'WhatsApp template category',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'category' } },
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		required: true,
		default: 'en_US',
		description: 'Template language code, for example en_US',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'language' } },
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Text', value: 'text' },
			{ name: 'Video', value: 'video' },
		],
		default: 'text',
		description: 'Type of the template header',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'contentType' } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		default: '',
		description: 'Body text; use {{1}}, {{2}} or named variables',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'Buttons (JSON)',
		name: 'buttonsJson',
		type: 'json',
		default: '',
		description:
			'JSON array of buttons, for example: [{"type":"quick_reply","replies":[{"text":"Yes"}]},{"type":"url","websites":[{"text":"Visit","url":"https://example.com"}]}]',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
	},
	{
		displayName: 'Template Location (JSON)',
		name: 'templateLocationJson',
		type: 'json',
		default: '',
		description:
			'JSON object for a location header, for example: {"name":"Head Office","address":"123 Main St","latitude":"22.30","longitude":"70.80"}',
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['template'], operation: ['update'] } },
		options: [
			{
				displayName: 'Add Security Recommendation',
				name: 'addSecurityRecommendation',
				type: 'boolean',
				default: false,
				description:
					'Whether to add the security recommendation line (authentication templates only)',
				routing: { send: { type: 'body', property: 'addSecurityRecommendation' } },
			},
			{
				displayName: 'Code Expiration Minutes',
				name: 'codeExpirationMinutes',
				type: 'number',
				default: 10,
				description: 'Minutes until the one-time code expires (authentication templates only)',
				routing: { send: { type: 'body', property: 'codeExpirationMinutes' } },
			},
			{
				displayName: 'Copy OTP Button Text',
				name: 'copyOtpButtonText',
				type: 'string',
				default: '',
				description: 'Label of the copy-code button (authentication templates only)',
				routing: { send: { type: 'body', property: 'copyOtpButtonText' } },
			},
			{
				displayName: 'Enable Code Expiration',
				name: 'enableCodeExpiration',
				type: 'boolean',
				default: false,
				description: 'Whether the one-time code expires (authentication templates only)',
				routing: { send: { type: 'body', property: 'enableCodeExpiration' } },
			},
			{
				displayName: 'Footer Text',
				name: 'footerText',
				type: 'string',
				default: '',
				description: 'Footer text shown below the template body',
				routing: { send: { type: 'body', property: 'footerText' } },
			},
			{
				displayName: 'Header Text',
				name: 'headerText',
				type: 'string',
				default: '',
				description: 'Header text (max 60 characters); used when Content Type is Text',
				routing: { send: { type: 'body', property: 'headerText' } },
			},
			{
				displayName: 'Template Document',
				name: 'templateDocument',
				type: 'string',
				default: '',
				description: 'PDF URL for the document header',
				routing: { send: { type: 'body', property: 'templateDocument' } },
			},
			{
				displayName: 'Template Image',
				name: 'templateImage',
				type: 'string',
				default: '',
				description: 'Public URL or base64 data URI of the header image',
				routing: { send: { type: 'body', property: 'templateImage' } },
			},
			{
				displayName: 'Template Video',
				name: 'templateVideo',
				type: 'string',
				default: '',
				description: 'Public URL or base64 data URI of the header video',
				routing: { send: { type: 'body', property: 'templateVideo' } },
			},
			{
				displayName: 'Variable Samples',
				name: 'variableSamples',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Sample' },
				default: [],
				description: 'Example values for the template variables, in order (used by Meta review)',
				routing: { send: { type: 'body', property: 'variable_samples' } },
			},
			{
				displayName: 'Variable Type',
				name: 'variableType',
				type: 'options',
				options: [
					{ name: 'Named', value: 'named' },
					{ name: 'Numeric', value: 'numeric' },
				],
				default: 'numeric',
				description: 'Style of body variables: numbered ({{1}}) or named ({{name}})',
				routing: { send: { type: 'body', property: 'variable_type' } },
			},
		],
	},
];
```

- [ ] **Step 9: Create `nodes/Zaple/resources/template/index.ts`.** This assembles the resource: the `Operation` options property (alphabetized by `name`, each option carrying `action`, `description`, and its `routing.request`) followed by the spread of every operation's field array. Create and Update attach the two `sendJsonField` preSend hooks; Get and Preview use expression URLs that read `$parameter.templateId` at runtime:

```ts
import type { INodeProperties } from 'n8n-workflow';

import { sendJsonField } from '../../shared/preSendFunctions';
import { templateCheckStatusFields } from './checkStatus';
import { templateCreateFields } from './create';
import { templateDeleteFields } from './del';
import { templateGetFields } from './get';
import { templateListFields } from './list';
import { templatePreviewFields } from './preview';
import { templateSetActiveFields } from './setActive';
import { templateUpdateFields } from './update';

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['template'] } },
		options: [
			{
				name: 'Activate/Deactivate',
				value: 'setActive',
				action: 'Activate or deactivate a template',
				description: 'Turn a template on or off for sending, addressed by its name identifier',
				routing: { request: { method: 'POST', url: '/api/v3/template-activation' } },
			},
			{
				name: 'Check Status',
				value: 'checkStatus',
				action: 'Check template status',
				description: 'Check the Meta approval status of a template',
				routing: { request: { method: 'GET', url: '/api/v3/template/status' } },
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a template',
				description: 'Create a WhatsApp message template and submit it for approval',
				routing: {
					request: { method: 'POST', url: '/api/v3/create-template' },
					send: {
						preSend: [
							sendJsonField('buttonsJson', 'buttons', 'Buttons (JSON)', 'array'),
							sendJsonField(
								'templateLocationJson',
								'templateLocation',
								'Template Location (JSON)',
								'object',
							),
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a template',
				description: 'Delete a template by its numeric database ID',
				routing: { request: { method: 'POST', url: '/api/v3/template/delete' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a template',
				description: 'Retrieve a single template by its send-API identifier',
				routing: {
					request: { method: 'GET', url: '=/api/v3/template/{{$parameter.templateId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				action: 'Get many templates',
				description: 'Retrieve a list of templates',
				routing: { request: { method: 'GET', url: '/api/v3/templates' } },
			},
			{
				name: 'Preview',
				value: 'preview',
				action: 'Preview a template',
				description: 'Retrieve a rendered preview of a template by its send-API identifier',
				routing: {
					request: { method: 'GET', url: '=/api/v3/template/{{$parameter.templateId}}/preview' },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a template',
				description: 'Update an existing template, addressed by its numeric database ID',
				routing: {
					request: { method: 'POST', url: '/api/v3/update-template' },
					send: {
						preSend: [
							sendJsonField('buttonsJson', 'buttons', 'Buttons (JSON)', 'array'),
							sendJsonField(
								'templateLocationJson',
								'templateLocation',
								'Template Location (JSON)',
								'object',
							),
						],
					},
				},
			},
		],
		default: 'list',
	},
	...templateCheckStatusFields,
	...templateCreateFields,
	...templateDeleteFields,
	...templateGetFields,
	...templateListFields,
	...templatePreviewFields,
	...templateSetActiveFields,
	...templateUpdateFields,
];
```

- [ ] **Step 10: Wire the Template resource into `nodes/Zaple/Zaple.node.ts`.** Task 4 left this file with only the Message resource wired. Apply the following three edits (the credentials block already lists `'template'` — do not touch it).

Edit 1 — add the import directly below the message import:

Before:

```ts
import { messageDescription } from './resources/message';
```

After:

```ts
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

Edit 2 — add the Template entry to the Resource options (alphabetical order: Template goes after Message):

Before:

```ts
				options: [{ name: 'Message', value: 'message' }],
				default: 'message',
```

After:

```ts
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
```

(Fallback: if the options array is instead already spread across multiple lines — one `{ name: 'Message', value: 'message' },` entry per line — replace that whole multi-line array with the multi-line "After" block above.)

Edit 3 — spread the template description after the message spread at the end of `properties`:

Before:

```ts
			...messageDescription,
		],
	};
}
```

After:

```ts
			...messageDescription,
			...templateDescription,
		],
	};
}
```

After all three edits, the complete file must read exactly (only the message-resource fields spread via `...messageDescription` come from Task 4's files; everything below is the full node shell):

```ts
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';

export class Zaple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple',
		name: 'zaple',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Zaple.ai WhatsApp Business API',
		defaults: { name: 'Zaple' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zapleApi',
				required: true,
				displayOptions: { show: { resource: ['message', 'template', 'batch', 'catalog'] } },
			},
			{
				name: 'zapleLeadsApi',
				required: true,
				displayOptions: { show: { resource: ['lead'] } },
			},
		],
		requestDefaults: {
			baseURL: 'https://app.zaple.ai',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
			},
			...messageDescription,
			...templateDescription,
		],
	};
}
```

- [ ] **Step 11: Build.** Run:

```
npm run build
```

Expected: exit code 0. Then verify the compiled template resource files exist:

```
ls dist/nodes/Zaple/resources/template
```

Expected: the listing includes `index.js`, `list.js`, `get.js`, `preview.js`, `create.js`, `update.js`, `checkStatus.js`, `setActive.js`, and `del.js` (plus `.d.ts` and `.js.map` companions).

- [ ] **Step 12: Lint.** Run:

```
npm run lint
```

Expected: exit code 0 with no reported problems. If the linter reports alphabetization errors, re-check the `options` arrays against the code above — every options list in this task is already sorted by `name`/`displayName`.

- [ ] **Step 13: Run the unit tests (regression check — no new tests in this task).** Run:

```
npm test
```

Expected: exit code 0 with output like:

```
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Step 14: Commit.** Run these two commands:

```
git add -A
git commit -m "feat: add Template resource"
```

Expected: exit code 0, output like `[main <hash>] feat: add Template resource` reporting 10 files changed (the 9 new files under `nodes/Zaple/resources/template/` plus the modified `nodes/Zaple/Zaple.node.ts`; `dist/` is git-ignored).


### Task 6: Batch resource (7 operations)

**Files:**
- Create: `nodes/Zaple/resources/batch/createList.ts`
- Create: `nodes/Zaple/resources/batch/upsertContacts.ts`
- Create: `nodes/Zaple/resources/batch/send.ts`
- Create: `nodes/Zaple/resources/batch/getStatus.ts`
- Create: `nodes/Zaple/resources/batch/getDetails.ts`
- Create: `nodes/Zaple/resources/batch/deleteList.ts`
- Create: `nodes/Zaple/resources/batch/deleteBatch.ts`
- Create: `nodes/Zaple/resources/batch/index.ts`
- Modify: `nodes/Zaple/Zaple.node.ts` (wire the Batch resource into the node shell — three anchor lines)
- Test: none new — this task is declarative n8n metadata, which the contract verifies via `npm run build` + `npm run lint` (and live API testing in Task 12). The existing `tests/mappers.test.ts` from Task 3 must stay green (`npm test`).

**Interfaces:**
- Consumes (from Task 3, module `nodes/Zaple/shared/preSendFunctions.ts`, imported in `nodes/Zaple/resources/batch/index.ts` via the exact path `'../../shared/preSendFunctions'`):
  - `mapBatchContacts(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>` — at runtime it reads the node parameters `inputMode` (`'ui' | 'json'`), `contactsJson` (JSON-array string), and `contactsUi` (`{ contact?: Array<{ countryCode: string; phoneNumber: string; name?: string }> }`) and writes the `contacts` array into the request body. **These parameter names (`inputMode`, `contactsJson`, `contactsUi`, sub-key `contact`, sub-fields `countryCode`/`phoneNumber`/`name`) are BINDING** — the field definitions in `upsertContacts.ts` below must use exactly these names or the preSend silently sends an empty `contacts` array.
- Consumes (from Task 4, extended by Task 5): the three anchor locations in `nodes/Zaple/Zaple.node.ts` — the resource import block, the Resource `options` array, and the description spreads at the end of `properties`. Task 6 inserts one line at each anchor (see Step 10), keeping every list alphabetized; `default: 'message'` is never changed.
- Produces:
  - `batchDescription: INodeProperties[]` from `nodes/Zaple/resources/batch/index.ts` (consumed by `nodes/Zaple/Zaple.node.ts`)
  - `batchCreateListFields: INodeProperties[]` from `nodes/Zaple/resources/batch/createList.ts`
  - `batchUpsertContactsFields: INodeProperties[]` from `nodes/Zaple/resources/batch/upsertContacts.ts`
  - `batchSendFields: INodeProperties[]` from `nodes/Zaple/resources/batch/send.ts`
  - `batchGetStatusFields: INodeProperties[]` from `nodes/Zaple/resources/batch/getStatus.ts`
  - `batchGetDetailsFields: INodeProperties[]` from `nodes/Zaple/resources/batch/getDetails.ts`
  - `batchDeleteListFields: INodeProperties[]` from `nodes/Zaple/resources/batch/deleteList.ts`
  - `batchDeleteBatchFields: INodeProperties[]` from `nodes/Zaple/resources/batch/deleteBatch.ts`

Background for the executor (no n8n or Zaple knowledge assumed): Zaple's Batch API sends one WhatsApp template message to every contact in a *contact list*. The lifecycle is: create a list (`POST /api/v2/lists`) → upsert contacts into it (`POST /api/v2/lists/{list_id}/contacts`) → send or schedule a batch (`POST /api/v2/messages/batch`) → poll status (`GET /api/v2/messages/batch/{batch_id}/status`) → fetch per-recipient details once complete (`GET .../details`); lists and future scheduled batches can be deleted. Two n8n mechanics matter here beyond what Task 4 used: (1) **path parameters** — a URL starting with `=` is an n8n *expression* evaluated at runtime, so `'=/api/v2/messages/batch/{{$parameter.batchId}}/status'` splices the `batchId` field into the path; fields used this way carry **NO `routing`** of their own (they only feed the URL); (2) **fixedCollection** — a repeatable group of named sub-fields (here: one "Contact" row of country code / phone number / name, repeatable via an "Add Contact" button); it carries NO routing because the Task 3 `mapBatchContacts` preSend converts the rows to the snake_case `contacts[]` array the API expects (or parses the raw-JSON alternative when Input Mode is JSON).

- [ ] **Step 1: Create the Batch resource directory**

Run from the project root `G:\Hardik Project\zaple-n8n`:

PowerShell:

```powershell
New-Item -ItemType Directory -Force "nodes\Zaple\resources\batch"
```

(bash equivalent: `mkdir -p nodes/Zaple/resources/batch`)

Expected output: a directory listing line ending in `batch`; the directory `nodes/Zaple/resources/batch` now exists.

- [ ] **Step 2: Create `nodes/Zaple/resources/batch/createList.ts`**

One required body field for `POST /api/v2/lists`. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchCreateListFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description:
			'Name of the new contact list. Zaple returns a duplicate_list_name error if a list with this name already exists.',
		displayOptions: { show: { resource: ['batch'], operation: ['createList'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
];
```

- [ ] **Step 3: Create `nodes/Zaple/resources/batch/upsertContacts.ts`**

Fields for `POST /api/v2/lists/{list_id}/contacts`. Nothing here carries `routing`: `listId` feeds the expression URL (wired in `index.ts`, Step 9), and the contacts themselves are built into the body by the Task 3 `mapBatchContacts` preSend, which reads `inputMode`, `contactsUi` (option key `contact`, sub-fields `countryCode`/`phoneNumber`/`name`) and `contactsJson` — all names binding per the Interfaces block above. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchUpsertContactsFields: INodeProperties[] = [
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to upsert into, as returned by Create Contact List',
		displayOptions: { show: { resource: ['batch'], operation: ['upsertContacts'] } },
	},
	{
		displayName: 'Input Mode',
		name: 'inputMode',
		type: 'options',
		options: [
			{ name: 'Fields Below', value: 'ui' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'ui',
		description: 'How the contacts are provided — as UI fields below or as a raw JSON array',
		displayOptions: { show: { resource: ['batch'], operation: ['upsertContacts'] } },
	},
	{
		displayName: 'Contacts',
		name: 'contactsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Contact',
		default: {},
		description: 'Contacts to add to the list, or update if the phone number already exists',
		displayOptions: {
			show: { resource: ['batch'], operation: ['upsertContacts'], inputMode: ['ui'] },
		},
		options: [
			{
				displayName: 'Contact',
				name: 'contact',
				values: [
					{
						displayName: 'Country Code',
						name: 'countryCode',
						type: 'string',
						default: '',
						placeholder: 'e.g. 91',
						description: 'Contact country calling code without the + sign, e.g. 91 for India',
					},
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						type: 'string',
						default: '',
						description: 'Contact phone number without the country code',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Optional display name stored with the contact',
					},
				],
			},
		],
	},
	{
		displayName: 'Contacts (JSON)',
		name: 'contactsJson',
		type: 'json',
		default: '[]',
		description:
			'JSON array of contact objects, e.g. [{"country_code":"91","phone_number":"9876543210","name":"John Doe"}]',
		displayOptions: {
			show: { resource: ['batch'], operation: ['upsertContacts'], inputMode: ['json'] },
		},
	},
];
```

(The `Contact` sub-fields stay in country code → phone number → name order — the API's own field order; the linter's alphabetization rule applies to `options`/`collection` entries, not to `fixedCollection` `values`.)

- [ ] **Step 4: Create `nodes/Zaple/resources/batch/send.ts`**

Body fields for `POST /api/v2/messages/batch`. All four route themselves into the body; `scheduledDatetime` is only visible (and therefore only sent) when `scheduledEnabled` is on — an n8n boolean can be used in `displayOptions.show` just like an options value. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchSendFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description:
			'Send-API template identifier, as shown in the Zaple template library — NOT the numeric database ID',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'template_id' } },
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to send to, as returned by Create Contact List',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'list_id' } },
	},
	{
		displayName: 'Scheduled',
		name: 'scheduledEnabled',
		type: 'boolean',
		default: false,
		description:
			'Whether to schedule the batch for later delivery — when off, the batch is sent immediately',
		displayOptions: { show: { resource: ['batch'], operation: ['send'] } },
		routing: { send: { type: 'body', property: 'scheduled_enabled' } },
	},
	{
		displayName: 'Scheduled Datetime',
		name: 'scheduledDatetime',
		type: 'string',
		default: '',
		placeholder: '2026-06-20 15:30:00',
		description: 'Date and time to send the batch at. Normalized to Asia/Kolkata by Zaple.',
		displayOptions: {
			show: { resource: ['batch'], operation: ['send'], scheduledEnabled: [true] },
		},
		routing: { send: { type: 'body', property: 'scheduled_datetime' } },
	},
];
```

- [ ] **Step 5: Create `nodes/Zaple/resources/batch/getStatus.ts`**

`batchId` feeds the expression URL `'=/api/v2/messages/batch/{{$parameter.batchId}}/status'` (wired in `index.ts`), so it carries NO routing. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchGetStatusFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the batch, as returned by Send Batch',
		displayOptions: { show: { resource: ['batch'], operation: ['getStatus'] } },
	},
];
```

- [ ] **Step 6: Create `nodes/Zaple/resources/batch/getDetails.ts`**

Same path-parameter pattern as Step 5 (NO routing — feeds `'=/api/v2/messages/batch/{{$parameter.batchId}}/details'`). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchGetDetailsFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description:
			'ID of the batch, as returned by Send Batch. Zaple returns a batch_not_completed error while the batch is still running.',
		displayOptions: { show: { resource: ['batch'], operation: ['getDetails'] } },
	},
];
```

- [ ] **Step 7: Create `nodes/Zaple/resources/batch/deleteList.ts`**

`listId` feeds `'=/api/v2/lists/{{$parameter.listId}}'` (NO routing). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchDeleteListFields: INodeProperties[] = [
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact list to delete. Only lists created via the API can be deleted.',
		displayOptions: { show: { resource: ['batch'], operation: ['deleteList'] } },
	},
];
```

- [ ] **Step 8: Create `nodes/Zaple/resources/batch/deleteBatch.ts`**

`batchId` feeds `'=/api/v2/messages/batch/{{$parameter.batchId}}'` (NO routing). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const batchDeleteBatchFields: INodeProperties[] = [
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the batch to delete. Only future scheduled batches can be deleted.',
		displayOptions: { show: { resource: ['batch'], operation: ['deleteBatch'] } },
	},
];
```

- [ ] **Step 9: Create `nodes/Zaple/resources/batch/index.ts`**

Assembles the resource: one `Operation` options property (each option carries the HTTP method + URL in `routing.request` — note the `=`-prefixed expression URLs splicing in the path-parameter fields from Steps 3, 5–8), followed by spreads of the seven field arrays. Options are alphabetized by `name`; every option has `action` and `description` (n8n linter requirements). Only `upsertContacts` needs a preSend hook (`mapBatchContacts` from Task 3). The batch paths used here are the cURL-verified forms from the approved spec (Task 12 re-verifies them live). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

import { mapBatchContacts } from '../../shared/preSendFunctions';
import { batchCreateListFields } from './createList';
import { batchDeleteBatchFields } from './deleteBatch';
import { batchDeleteListFields } from './deleteList';
import { batchGetDetailsFields } from './getDetails';
import { batchGetStatusFields } from './getStatus';
import { batchSendFields } from './send';
import { batchUpsertContactsFields } from './upsertContacts';

export const batchDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['batch'] } },
		options: [
			{
				name: 'Create Contact List',
				value: 'createList',
				action: 'Create a contact list',
				description: 'Create a new contact list for batch messaging',
				routing: { request: { method: 'POST', url: '/api/v2/lists' } },
			},
			{
				name: 'Delete Batch',
				value: 'deleteBatch',
				action: 'Delete a batch',
				description: 'Delete a future scheduled batch before it runs',
				routing: {
					request: { method: 'DELETE', url: '=/api/v2/messages/batch/{{$parameter.batchId}}' },
				},
			},
			{
				name: 'Delete List',
				value: 'deleteList',
				action: 'Delete a contact list',
				description: 'Delete a contact list that was created via the API',
				routing: { request: { method: 'DELETE', url: '=/api/v2/lists/{{$parameter.listId}}' } },
			},
			{
				name: 'Get Batch Details',
				value: 'getDetails',
				action: 'Get batch details',
				description: 'Get the paginated per-recipient results of a completed batch',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/details',
					},
				},
			},
			{
				name: 'Get Batch Status',
				value: 'getStatus',
				action: 'Get batch status',
				description: 'Get the current processing status of a batch send',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/status',
					},
				},
			},
			{
				name: 'Send Batch',
				value: 'send',
				action: 'Send a batch',
				description: 'Send a template message to every contact in a list, immediately or scheduled',
				routing: { request: { method: 'POST', url: '/api/v2/messages/batch' } },
			},
			{
				name: 'Upsert Contacts',
				value: 'upsertContacts',
				action: 'Upsert contacts into a list',
				description: 'Add contacts to a list, updating any that already exist',
				routing: {
					request: { method: 'POST', url: '=/api/v2/lists/{{$parameter.listId}}/contacts' },
					send: { preSend: [mapBatchContacts] },
				},
			},
		],
		default: 'send',
	},
	...batchCreateListFields,
	...batchDeleteBatchFields,
	...batchDeleteListFields,
	...batchGetDetailsFields,
	...batchGetStatusFields,
	...batchSendFields,
	...batchUpsertContactsFields,
];
```

- [ ] **Step 10: Modify `nodes/Zaple/Zaple.node.ts` — wire in the Batch resource**

Task 4 created this file and defined three anchor locations; Task 5 already added the Template resource at each of them. Task 6 inserts exactly one line at each anchor. `Batch` sorts FIRST alphabetically in every list; `default: 'message'` and the `credentials` block are NOT touched. (If the working tree shows the Resource `options` array formatted differently than the "before" snippet — e.g. Task 5 left it on a single line — apply the same logical insertion, keep entries alphabetized by `name`, and match the multi-line "after" form shown here, which is the contract's final-state formatting.)

Anchor 1 — the resource import block near the top of the file.

Before:

```ts
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

After:

```ts
import { batchDescription } from './resources/batch';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

Anchor 2 — the Resource `options` array inside `properties`.

Before:

```ts
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

After:

```ts
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

Anchor 3 — the description spreads at the end of `properties`.

Before:

```ts
			...messageDescription,
			...templateDescription,
```

After:

```ts
			...batchDescription,
			...messageDescription,
			...templateDescription,
```

- [ ] **Step 11: Build**

Run from the project root:

```powershell
npm run build
```

Expected output: `n8n-node build` compiles TypeScript and exits with code 0 (no TS errors). Verify the compiled resource exists:

```powershell
node -e "console.log(require('fs').existsSync('dist/nodes/Zaple/resources/batch/index.js'))"
```

Expected output:

```
true
```

- [ ] **Step 12: Lint**

```powershell
npm run lint
```

Expected output: `n8n-node lint` (ESLint with n8n community-node rules) reports no errors and exits with code 0. If it reports unsorted-options or missing-description errors, fix the flagged property in place — the code above is written to satisfy the alphabetization, `action`/`description`, and boolean-"Whether" rules.

- [ ] **Step 13: Confirm existing unit tests still pass**

```powershell
npm test
```

Expected output: vitest runs the Task 3 suite and exits 0, with a summary containing:

```
 ✓ tests/mappers.test.ts
 Test Files  1 passed (1)
```

(No new tests in this task — declarative metadata is not unit-tested per the contract; the `mapBatchContacts` logic this resource consumes was already unit-tested in Task 3, and the wiring is verified by build + lint here and live API testing in Task 12.)

- [ ] **Step 14: Commit**

```powershell
git add nodes/Zaple/Zaple.node.ts nodes/Zaple/resources/batch
git commit -m "feat: add Batch resource"
```

Expected output: a line like `[main <shorthash>] feat: add Batch resource` followed by `9 files changed` (8 new files + `Zaple.node.ts`).


### Task 7: Lead resource

**Files:**
- Create: `nodes/Zaple/resources/lead/submit.ts`
- Create: `nodes/Zaple/resources/lead/index.ts`
- Modify: `nodes/Zaple/Zaple.node.ts` (wire the Lead resource into the node shell — three anchor lines)
- Test: none new — this task is declarative n8n metadata, which the contract verifies via `npm run build` + `npm run lint` (and live API testing in Task 12). The existing `tests/mappers.test.ts` from Task 3 must stay green (`npm test`).

**Interfaces:**
- Consumes (from Task 3, module `nodes/Zaple/shared/preSendFunctions.ts`, imported in `nodes/Zaple/resources/lead/index.ts` via the exact path `'../../shared/preSendFunctions'`):
  - `mapLeadFields(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>` — at runtime it reads the node parameters `customFieldsMode` (`'none' | 'ui' | 'json'`), `customFieldsUi` (`{ field?: Array<{ key: string; value: string }> }`), `customFieldsJson` (JSON-object string), and `additionalFields` (specifically its `metaJson` sub-key, a JSON-object string) and writes `custom_fields` / `meta` objects into the request body. **These parameter names (`customFieldsMode`, `customFieldsUi`, its option key `field` with sub-fields `key`/`value`, `customFieldsJson`, and `metaJson` INSIDE the `additionalFields` collection) are BINDING** — the field definitions in `submit.ts` below must use exactly these names or the preSend silently sends nothing.
- Consumes (from Task 4, as extended by Tasks 5–6): the three anchor locations in `nodes/Zaple/Zaple.node.ts` — the resource import block, the Resource `options` array, and the description spreads at the end of `properties`. Task 7 inserts one line at each anchor (see Step 4), keeping every list alphabetized; `default: 'message'` is never changed.
- Consumes (from Task 2): the `zapleLeadsApi` credential class. **No credential edits are needed in this task** — Task 4's node shell already contains the full `credentials` block with the `zapleLeadsApi` entry gated by `displayOptions: { show: { resource: ['lead'] } }`, so as soon as the `lead` resource option exists, n8n automatically asks for (and injects) the Zaple Leads API credential for Lead operations.
- Produces:
  - `leadDescription: INodeProperties[]` from `nodes/Zaple/resources/lead/index.ts` (consumed by `nodes/Zaple/Zaple.node.ts`)
  - `leadSubmitFields: INodeProperties[]` from `nodes/Zaple/resources/lead/submit.ts`

Background for the executor (no n8n or Zaple knowledge assumed): Zaple's Leads API captures leads (e.g. from website forms) into the Zaple CRM. It is a SEPARATE product surface from the main messaging API: it lives under `/api/v1/leads`, and it authenticates with different headers (`X-Zaple-Api-Key` / `X-Zaple-Api-Secret` — note the `X-` prefix) supplied by the second credential type built in Task 2 (`zapleLeadsApi`). The single operation is `POST /api/v1/leads`; the API requires at least one of `phone`/`email` (enforced server-side — the node does not duplicate that validation), and supports an idempotency key `external_event_id` (repeat submissions with the same ID return the existing lead instead of creating a duplicate). Two body keys are objects that flat `routing.send` metadata cannot build — `custom_fields` (free-form key/value map, offered in the UI as either repeatable key/value rows or a raw-JSON field) and `meta` (raw-JSON metadata object) — so the operation attaches the Task 3 `mapLeadFields` preSend hook, and the parameters feeding it (`customFieldsMode`, `customFieldsUi`, `customFieldsJson`, and `metaJson` inside Additional Fields) carry **NO `routing` of their own**. A `type: 'notice'` property is a display-only n8n banner (renders `displayName` as an info box, sends nothing) used here to warn users about the separate credential and the phone-or-email rule.

- [ ] **Step 1: Create the Lead resource directory**

Run from the project root `G:\Hardik Project\zaple-n8n`:

PowerShell:

```powershell
New-Item -ItemType Directory -Force "nodes\Zaple\resources\lead"
```

(bash equivalent: `mkdir -p nodes/Zaple/resources/lead`)

Expected output: a directory listing line ending in `lead`; the directory `nodes/Zaple/resources/lead` now exists.

- [ ] **Step 2: Create `nodes/Zaple/resources/lead/submit.ts`**

Fields for `POST /api/v1/leads`. Conventions at work (all binding):
- The notice property is display-only (`type: 'notice'`, empty `default`) — its `displayName` is the banner text.
- `phone` and `email` route themselves into the body; neither is `required: true` because the API accepts either one (the notice explains this to the user).
- `customFieldsMode` / `customFieldsUi` / `customFieldsJson` carry NO routing — the Task 3 `mapLeadFields` preSend (wired in `index.ts`, Step 3) reads them and builds the `custom_fields` body object. `customFieldsUi` is a `fixedCollection` (repeatable key/value rows under the option key `field`); `customFieldsJson` is a raw-JSON alternative shown only when Custom Fields Mode is JSON.
- Inside Additional Fields, every sub-option routes itself into the body under its snake_case key EXCEPT `metaJson`, which has NO routing — `mapLeadFields` parses it and merges it into the body as `meta`.
- Collection options are alphabetized by `displayName` (n8n linter requirement).

Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const leadSubmitFields: INodeProperties[] = [
	{
		displayName:
			'This operation uses the separate Zaple Leads API credential (X-Zaple-Api-Key). At least one of Phone or Email is required.',
		name: 'leadSubmitNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['lead'], operation: ['submit'] } },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Phone number of the lead — at least one of Phone or Email must be provided',
		displayOptions: { show: { resource: ['lead'], operation: ['submit'] } },
		routing: { send: { type: 'body', property: 'phone' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email address of the lead — at least one of Phone or Email must be provided',
		displayOptions: { show: { resource: ['lead'], operation: ['submit'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Custom Fields Mode',
		name: 'customFieldsMode',
		type: 'options',
		options: [
			{ name: 'Fields Below', value: 'ui' },
			{ name: 'JSON', value: 'json' },
			{ name: 'None', value: 'none' },
		],
		default: 'none',
		description: 'How the free-form custom fields are provided',
		displayOptions: { show: { resource: ['lead'], operation: ['submit'] } },
	},
	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		description: 'Free-form key/value pairs stored on the lead as custom_fields',
		displayOptions: {
			show: { resource: ['lead'], operation: ['submit'], customFieldsMode: ['ui'] },
		},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the custom field',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the custom field',
					},
				],
			},
		],
	},
	{
		displayName: 'Custom Fields (JSON)',
		name: 'customFieldsJson',
		type: 'json',
		default: '{}',
		description:
			'JSON object of free-form key/value pairs, e.g. {"budget":"50k","city":"Rajkot"}',
		displayOptions: {
			show: { resource: ['lead'], operation: ['submit'], customFieldsMode: ['json'] },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['lead'], operation: ['submit'] } },
		options: [
			{
				displayName: 'Campaign Name',
				name: 'campaignName',
				type: 'string',
				default: '',
				description: 'Name of the campaign the lead came from',
				routing: { send: { type: 'body', property: 'campaign_name' } },
			},
			{
				displayName: 'External Event ID',
				name: 'externalEventId',
				type: 'string',
				default: '',
				description:
					'Idempotency key — repeat submissions with the same ID return the existing lead',
				routing: { send: { type: 'body', property: 'external_event_id' } },
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				default: '',
				description: 'Full name of the lead',
				routing: { send: { type: 'body', property: 'full_name' } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Free-text message submitted by the lead',
				routing: { send: { type: 'body', property: 'message' } },
			},
			{
				displayName: 'Meta (JSON)',
				name: 'metaJson',
				type: 'json',
				default: '',
				description:
					'JSON object of extra metadata stored with the lead, e.g. {"page_url":"https://…","form_id":"contact"}',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Lead source identifier. Defaults to website_form server-side.',
				routing: { send: { type: 'body', property: 'source' } },
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				description: 'UTM campaign attribution value',
				routing: { send: { type: 'body', property: 'utm_campaign' } },
			},
			{
				displayName: 'UTM Medium',
				name: 'utmMedium',
				type: 'string',
				default: '',
				description: 'UTM medium attribution value',
				routing: { send: { type: 'body', property: 'utm_medium' } },
			},
			{
				displayName: 'UTM Source',
				name: 'utmSource',
				type: 'string',
				default: '',
				description: 'UTM source attribution value',
				routing: { send: { type: 'body', property: 'utm_source' } },
			},
		],
	},
];
```

- [ ] **Step 3: Create `nodes/Zaple/resources/lead/index.ts`**

Assembles the resource: one `Operation` options property with the single Submit operation (carrying the HTTP method + URL in `routing.request` and the Task 3 `mapLeadFields` preSend hook in `routing.send.preSend`), followed by the spread of the Submit field array. The option has `action` and `description` (n8n linter requirements). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

import { mapLeadFields } from '../../shared/preSendFunctions';
import { leadSubmitFields } from './submit';

export const leadDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['lead'] } },
		options: [
			{
				name: 'Submit',
				value: 'submit',
				action: 'Submit a lead',
				description: 'Submit a captured lead with optional attribution and custom fields',
				routing: {
					request: { method: 'POST', url: '/api/v1/leads' },
					send: { preSend: [mapLeadFields] },
				},
			},
		],
		default: 'submit',
	},
	...leadSubmitFields,
];
```

- [ ] **Step 4: Modify `nodes/Zaple/Zaple.node.ts` — wire in the Lead resource**

Task 4 created this file and defined three anchor locations; Tasks 5 and 6 already added the Template and Batch resources at each of them. Task 7 inserts exactly one line at each anchor. `Lead` sorts between `Batch` and `Message` alphabetically; `default: 'message'` and the `credentials` block are NOT touched — the credentials block already contains the `zapleLeadsApi` entry gated on `resource: ['lead']`, so Lead operations authenticate with the Zaple Leads API credential automatically once this resource exists.

Anchor 1 — the resource import block near the top of the file.

Before:

```ts
import { batchDescription } from './resources/batch';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

After:

```ts
import { batchDescription } from './resources/batch';
import { leadDescription } from './resources/lead';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

Anchor 2 — the Resource `options` array inside `properties`.

Before:

```ts
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

After:

```ts
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

Anchor 3 — the description spreads at the end of `properties`.

Before:

```ts
			...batchDescription,
			...messageDescription,
			...templateDescription,
```

After:

```ts
			...batchDescription,
			...leadDescription,
			...messageDescription,
			...templateDescription,
```

- [ ] **Step 5: Build**

Run from the project root:

```powershell
npm run build
```

Expected output: `n8n-node build` compiles TypeScript and exits with code 0 (no TS errors). Verify the compiled resource exists:

```powershell
node -e "console.log(require('fs').existsSync('dist/nodes/Zaple/resources/lead/index.js'))"
```

Expected output:

```
true
```

- [ ] **Step 6: Lint**

```powershell
npm run lint
```

Expected output: `n8n-node lint` (ESLint with n8n community-node rules) reports no errors and exits with code 0. If it reports unsorted-options or missing-description errors, fix the flagged property in place — the code above is written to satisfy the alphabetization and `action`/`description` rules.

- [ ] **Step 7: Confirm existing unit tests still pass**

```powershell
npm test
```

Expected output: vitest runs the Task 3 suite and exits 0, with a summary containing:

```
 ✓ tests/mappers.test.ts
 Test Files  1 passed (1)
```

(No new tests in this task — declarative metadata is not unit-tested per the contract; the `mapLeadFields` logic this resource consumes was already unit-tested in Task 3, and the wiring is verified by build + lint here and live API testing in Task 12.)

- [ ] **Step 8: Commit**

```powershell
git add nodes/Zaple/Zaple.node.ts nodes/Zaple/resources/lead
git commit -m "feat: add Lead resource"
```

Expected output: a line like `[main <shorthash>] feat: add Lead resource` followed by `3 files changed` (2 new files + `Zaple.node.ts`).

### Task 8: Catalog resource

**Files:**
- Create: `nodes/Zaple/resources/catalog/getAll.ts`
- Create: `nodes/Zaple/resources/catalog/create.ts`
- Create: `nodes/Zaple/resources/catalog/connectWaba.ts`
- Create: `nodes/Zaple/resources/catalog/disconnectWaba.ts`
- Create: `nodes/Zaple/resources/catalog/listProducts.ts`
- Create: `nodes/Zaple/resources/catalog/createProduct.ts`
- Create: `nodes/Zaple/resources/catalog/getCommerceSettings.ts`
- Create: `nodes/Zaple/resources/catalog/setVisibility.ts`
- Create: `nodes/Zaple/resources/catalog/index.ts`
- Modify: `nodes/Zaple/Zaple.node.ts` (wire the Catalog resource into the node shell — three anchor lines; this completes the node's final form per the contract)
- Test: none new — this task is declarative n8n metadata, which the contract verifies via `npm run build` + `npm run lint` (and live API testing in Task 12). The existing `tests/mappers.test.ts` from Task 3 must stay green (`npm test`).

**Interfaces:**
- Consumes (from Task 4, as extended by Tasks 5–7): the three anchor locations in `nodes/Zaple/Zaple.node.ts` — the resource import block, the Resource `options` array, and the description spreads at the end of `properties`. Task 8 inserts one line at each anchor (see Step 11), keeping every list alphabetized; `default: 'message'` is never changed. After this task the file matches the contract's final node shell exactly (full expected file shown in Step 11).
- Consumes: no preSend functions — every Catalog field either routes itself via `routing.send` or feeds an expression URL as a path parameter, so `nodes/Zaple/resources/catalog/index.ts` imports nothing from `../../shared/preSendFunctions`.
- Produces:
  - `catalogDescription: INodeProperties[]` from `nodes/Zaple/resources/catalog/index.ts` (consumed by `nodes/Zaple/Zaple.node.ts`)
  - `catalogGetAllFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/getAll.ts`
  - `catalogCreateFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/create.ts`
  - `catalogConnectWabaFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/connectWaba.ts`
  - `catalogDisconnectWabaFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/disconnectWaba.ts`
  - `catalogListProductsFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/listProducts.ts`
  - `catalogCreateProductFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/createProduct.ts`
  - `catalogGetCommerceSettingsFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/getCommerceSettings.ts`
  - `catalogSetVisibilityFields: INodeProperties[]` from `nodes/Zaple/resources/catalog/setVisibility.ts`

Background for the executor (no n8n or Zaple knowledge assumed): a Zaple *catalog* is a WhatsApp Commerce product catalog — a list of products (name, price, images, …) that can be attached to a WhatsApp Business Account (WABA) so customers can browse and order in-chat. The API surface is: list catalogs, create a catalog, connect/disconnect a catalog to/from the WABA, list/add products in a catalog, read the account's commerce settings, and show/hide a catalog. All Catalog operations use the MAIN `zapleApi` credential (already gated in the node shell's `credentials` block — not touched here). Mechanics reused from earlier tasks: path parameters ride in `=`-prefixed expression URLs (`'=/api/v2/catalogs/{{$parameter.catalogId}}/connect'` splices the `catalogId` field into the path at runtime — such fields carry **NO `routing`**), and simple body fields self-route via `routing: { send: { type: 'body', property: '<snake_case>' } }`. Two operations take no parameters at all (Get Many, Get Commerce Settings); their field files export an EMPTY array purely to keep the one-file-per-operation structure consistent — the resource `index.ts` still spreads them. PATH NOTE (from the approved spec): for Get Commerce Settings the Zaple docs' section heading said `/api/v2/catalogs/commerce-settings`, but the docs' own cURL example says `GET /api/v2/commerce/settings` — the cURL path wins here (spec decision) and is re-verified against the live API in Task 12.

- [ ] **Step 1: Create the Catalog resource directory**

Run from the project root `G:\Hardik Project\zaple-n8n`:

PowerShell:

```powershell
New-Item -ItemType Directory -Force "nodes\Zaple\resources\catalog"
```

(bash equivalent: `mkdir -p nodes/Zaple/resources/catalog`)

Expected output: a directory listing line ending in `catalog`; the directory `nodes/Zaple/resources/catalog` now exists.

- [ ] **Step 2: Create `nodes/Zaple/resources/catalog/getAll.ts`**

`GET /api/v2/catalogs` takes no parameters; the file exports an empty array for structural consistency (the export name and its spread in `index.ts` are part of the binding naming scheme). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

// Get Many takes no parameters — empty by design.
export const catalogGetAllFields: INodeProperties[] = [];
```

- [ ] **Step 3: Create `nodes/Zaple/resources/catalog/create.ts`**

One required body field for `POST /api/v2/catalogs`. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogCreateFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the new product catalog',
		displayOptions: { show: { resource: ['catalog'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
];
```

- [ ] **Step 4: Create `nodes/Zaple/resources/catalog/connectWaba.ts`**

`catalogId` feeds the expression URL `'=/api/v2/catalogs/{{$parameter.catalogId}}/connect'` (wired in `index.ts`, Step 10), so it carries NO routing. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogConnectWabaFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog to connect, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['connectWaba'] } },
	},
];
```

- [ ] **Step 5: Create `nodes/Zaple/resources/catalog/disconnectWaba.ts`**

Same path-parameter pattern (NO routing — feeds `'=/api/v2/catalogs/{{$parameter.catalogId}}/disconnect'`). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogDisconnectWabaFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog to disconnect, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['disconnectWaba'] } },
	},
];
```

- [ ] **Step 6: Create `nodes/Zaple/resources/catalog/listProducts.ts`**

Same path-parameter pattern (NO routing — feeds `'=/api/v2/catalogs/{{$parameter.catalogId}}/products'`). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogListProductsFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog to list products from, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['listProducts'] } },
	},
];
```

- [ ] **Step 7: Create `nodes/Zaple/resources/catalog/createProduct.ts`**

Fields for `POST /api/v2/catalogs/{catalog_id}/products`: `catalogId` is the path parameter (NO routing), `name` is the only required body field, and every optional product attribute lives in an Additional Fields collection whose sub-options route themselves into the body under their snake_case keys. `additionalImageUrls` is a multi-value string list that routes directly as the `additional_image_urls` array (same pattern as `tags` in Task 4); `inventory` is a number. Collection options are alphabetized by `displayName` (n8n linter requirement). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogCreateProductFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog to add the product to, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['createProduct'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the product',
		displayOptions: { show: { resource: ['catalog'], operation: ['createProduct'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['catalog'], operation: ['createProduct'] } },
		options: [
			{
				displayName: 'Additional Image URLs',
				name: 'additionalImageUrls',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Image URL' },
				default: [],
				description: 'Public URLs of extra product images',
				routing: { send: { type: 'body', property: 'additional_image_urls' } },
			},
			{
				displayName: 'Availability',
				name: 'availability',
				type: 'string',
				default: '',
				description: 'Availability status of the product, e.g. in stock or out of stock',
				routing: { send: { type: 'body', property: 'availability' } },
			},
			{
				displayName: 'Brand',
				name: 'brand',
				type: 'string',
				default: '',
				description: 'Brand name of the product',
				routing: { send: { type: 'body', property: 'brand' } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'Category the product belongs to',
				routing: { send: { type: 'body', property: 'category' } },
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				default: '',
				description: 'Color of the product',
				routing: { send: { type: 'body', property: 'color' } },
			},
			{
				displayName: 'Condition',
				name: 'condition',
				type: 'string',
				default: '',
				description: 'Condition of the product, e.g. new, refurbished, or used',
				routing: { send: { type: 'body', property: 'condition' } },
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'e.g. INR',
				description: 'ISO 4217 currency code for the price, e.g. INR or USD',
				routing: { send: { type: 'body', property: 'currency' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description text of the product',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
				description: 'Target gender of the product, e.g. male, female, or unisex',
				routing: { send: { type: 'body', property: 'gender' } },
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				description: 'Public URL of the main product image',
				routing: { send: { type: 'body', property: 'image_url' } },
			},
			{
				displayName: 'Inventory',
				name: 'inventory',
				type: 'number',
				default: 0,
				description: 'Available stock quantity of the product',
				routing: { send: { type: 'body', property: 'inventory' } },
			},
			{
				displayName: 'Material',
				name: 'material',
				type: 'string',
				default: '',
				description: 'Material the product is made of, e.g. cotton',
				routing: { send: { type: 'body', property: 'material' } },
			},
			{
				displayName: 'Origin Country',
				name: 'originCountry',
				type: 'string',
				default: '',
				placeholder: 'e.g. IN',
				description: 'Country of origin of the product',
				routing: { send: { type: 'body', property: 'origin_country' } },
			},
			{
				displayName: 'Pattern',
				name: 'pattern',
				type: 'string',
				default: '',
				description: 'Pattern of the product, e.g. striped',
				routing: { send: { type: 'body', property: 'pattern' } },
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'string',
				default: '',
				placeholder: 'e.g. 199.00',
				description: 'Price of the product',
				routing: { send: { type: 'body', property: 'price' } },
			},
			{
				displayName: 'Product Type',
				name: 'productType',
				type: 'string',
				default: '',
				description: 'Retailer-defined product type or category path',
				routing: { send: { type: 'body', property: 'product_type' } },
			},
			{
				displayName: 'Retailer ID',
				name: 'retailerId',
				type: 'string',
				default: '',
				description: 'Your unique identifier (SKU) for the product',
				routing: { send: { type: 'body', property: 'retailer_id' } },
			},
			{
				displayName: 'Sale Price',
				name: 'salePrice',
				type: 'string',
				default: '',
				description: 'Discounted sale price of the product',
				routing: { send: { type: 'body', property: 'sale_price' } },
			},
			{
				displayName: 'Sale Price End Date',
				name: 'salePriceEndDate',
				type: 'string',
				default: '',
				placeholder: 'e.g. 2026-08-31',
				description: 'End of the sale price period',
				routing: { send: { type: 'body', property: 'sale_price_end_date' } },
			},
			{
				displayName: 'Sale Price Start Date',
				name: 'salePriceStartDate',
				type: 'string',
				default: '',
				placeholder: 'e.g. 2026-08-01',
				description: 'Start of the sale price period',
				routing: { send: { type: 'body', property: 'sale_price_start_date' } },
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				default: '',
				description: 'Size of the product, e.g. M or XL',
				routing: { send: { type: 'body', property: 'size' } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Link to the product page on your website',
				routing: { send: { type: 'body', property: 'url' } },
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'string',
				default: '',
				description: 'Visibility of the product in the catalog, e.g. published or hidden',
				routing: { send: { type: 'body', property: 'visibility' } },
			},
		],
	},
];
```

- [ ] **Step 8: Create `nodes/Zaple/resources/catalog/getCommerceSettings.ts`**

`GET /api/v2/commerce/settings` takes no parameters; the file exports an empty array for structural consistency. (Path reminder: the docs' heading said `/api/v2/catalogs/commerce-settings`, but the docs' cURL example — which this plan follows — says `/api/v2/commerce/settings`; Task 12 re-verifies it live.) Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

// Get Commerce Settings takes no parameters — empty by design.
export const catalogGetCommerceSettingsFields: INodeProperties[] = [];
```

- [ ] **Step 9: Create `nodes/Zaple/resources/catalog/setVisibility.ts`**

`catalogId` feeds the expression URL `'=/api/v2/catalogs/{{$parameter.catalogId}}/visibility'` (NO routing); `visible` routes itself into the body as a boolean (its description starts with "Whether" — n8n linter rule for booleans). Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

export const catalogSetVisibilityFields: INodeProperties[] = [
	{
		displayName: 'Catalog ID',
		name: 'catalogId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the catalog, as returned by Get Many or Create',
		displayOptions: { show: { resource: ['catalog'], operation: ['setVisibility'] } },
	},
	{
		displayName: 'Visible',
		name: 'visible',
		type: 'boolean',
		default: true,
		description: 'Whether the catalog is visible to customers',
		displayOptions: { show: { resource: ['catalog'], operation: ['setVisibility'] } },
		routing: { send: { type: 'body', property: 'visible' } },
	},
];
```

- [ ] **Step 10: Create `nodes/Zaple/resources/catalog/index.ts`**

Assembles the resource: one `Operation` options property (each option carries the HTTP method + URL in `routing.request` — note the `=`-prefixed expression URLs splicing in the `catalogId` path parameter), followed by spreads of all eight field arrays (including the two empty ones). Options are alphabetized by `name`; every option has `action` and `description` (n8n linter requirements). No preSend hooks are needed for this resource. Full file contents:

```ts
import type { INodeProperties } from 'n8n-workflow';

import { catalogConnectWabaFields } from './connectWaba';
import { catalogCreateFields } from './create';
import { catalogCreateProductFields } from './createProduct';
import { catalogDisconnectWabaFields } from './disconnectWaba';
import { catalogGetAllFields } from './getAll';
import { catalogGetCommerceSettingsFields } from './getCommerceSettings';
import { catalogListProductsFields } from './listProducts';
import { catalogSetVisibilityFields } from './setVisibility';

export const catalogDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['catalog'] } },
		options: [
			{
				name: 'Connect WABA',
				value: 'connectWaba',
				action: 'Connect a catalog to WABA',
				description: 'Connect a catalog to your WhatsApp Business Account',
				routing: {
					request: { method: 'POST', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/connect' },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a catalog',
				description: 'Create a new product catalog',
				routing: { request: { method: 'POST', url: '/api/v2/catalogs' } },
			},
			{
				name: 'Create Product',
				value: 'createProduct',
				action: 'Create a product',
				description: 'Add a product to a catalog',
				routing: {
					request: { method: 'POST', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/products' },
				},
			},
			{
				name: 'Disconnect WABA',
				value: 'disconnectWaba',
				action: 'Disconnect a catalog from WABA',
				description: 'Disconnect a catalog from your WhatsApp Business Account',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v2/catalogs/{{$parameter.catalogId}}/disconnect',
					},
				},
			},
			{
				name: 'Get Commerce Settings',
				value: 'getCommerceSettings',
				action: 'Get commerce settings',
				description: 'Get the WhatsApp commerce settings of the connected account',
				routing: { request: { method: 'GET', url: '/api/v2/commerce/settings' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many catalogs',
				description: 'Retrieve a list of all product catalogs',
				routing: { request: { method: 'GET', url: '/api/v2/catalogs' } },
			},
			{
				name: 'List Products',
				value: 'listProducts',
				action: 'List products in a catalog',
				description: 'Retrieve the products of a catalog',
				routing: {
					request: { method: 'GET', url: '=/api/v2/catalogs/{{$parameter.catalogId}}/products' },
				},
			},
			{
				name: 'Set Visibility',
				value: 'setVisibility',
				action: 'Set catalog visibility',
				description: 'Show or hide a catalog',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v2/catalogs/{{$parameter.catalogId}}/visibility',
					},
				},
			},
		],
		default: 'getAll',
	},
	...catalogConnectWabaFields,
	...catalogCreateFields,
	...catalogCreateProductFields,
	...catalogDisconnectWabaFields,
	...catalogGetAllFields,
	...catalogGetCommerceSettingsFields,
	...catalogListProductsFields,
	...catalogSetVisibilityFields,
];
```

- [ ] **Step 11: Modify `nodes/Zaple/Zaple.node.ts` — wire in the Catalog resource**

Tasks 5–7 already added Template, Batch, and Lead at the three anchor locations; Task 8 inserts exactly one line at each. `Catalog` sorts between `Batch` and `Lead` alphabetically; `default: 'message'` and the `credentials` block are NOT touched (the credentials block already lists `'catalog'` under the `zapleApi` credential).

Anchor 1 — the resource import block near the top of the file.

Before:

```ts
import { batchDescription } from './resources/batch';
import { leadDescription } from './resources/lead';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

After:

```ts
import { batchDescription } from './resources/batch';
import { catalogDescription } from './resources/catalog';
import { leadDescription } from './resources/lead';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';
```

Anchor 2 — the Resource `options` array inside `properties`.

Before:

```ts
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

After:

```ts
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Catalog', value: 'catalog' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
```

Anchor 3 — the description spreads at the end of `properties`.

Before:

```ts
			...batchDescription,
			...leadDescription,
			...messageDescription,
			...templateDescription,
```

After:

```ts
			...batchDescription,
			...catalogDescription,
			...leadDescription,
			...messageDescription,
			...templateDescription,
```

After all three edits, `nodes/Zaple/Zaple.node.ts` has reached its FINAL form and must read exactly (this is the contract's node shell, now fully wired):

```ts
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { batchDescription } from './resources/batch';
import { catalogDescription } from './resources/catalog';
import { leadDescription } from './resources/lead';
import { messageDescription } from './resources/message';
import { templateDescription } from './resources/template';

export class Zaple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple',
		name: 'zaple',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Zaple.ai WhatsApp Business API',
		defaults: { name: 'Zaple' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zapleApi',
				required: true,
				displayOptions: { show: { resource: ['message', 'template', 'batch', 'catalog'] } },
			},
			{
				name: 'zapleLeadsApi',
				required: true,
				displayOptions: { show: { resource: ['lead'] } },
			},
		],
		requestDefaults: {
			baseURL: 'https://app.zaple.ai',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Batch', value: 'batch' },
					{ name: 'Catalog', value: 'catalog' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Message', value: 'message' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
			},
			...batchDescription,
			...catalogDescription,
			...leadDescription,
			...messageDescription,
			...templateDescription,
		],
	};
}
```

- [ ] **Step 12: Build**

Run from the project root:

```powershell
npm run build
```

Expected output: `n8n-node build` compiles TypeScript and exits with code 0 (no TS errors). Verify the compiled resource exists:

```powershell
node -e "console.log(require('fs').existsSync('dist/nodes/Zaple/resources/catalog/index.js'))"
```

Expected output:

```
true
```

- [ ] **Step 13: Lint**

```powershell
npm run lint
```

Expected output: `n8n-node lint` (ESLint with n8n community-node rules) reports no errors and exits with code 0. If it reports unsorted-options or missing-description errors, fix the flagged property in place — the code above is written to satisfy the alphabetization, `action`/`description`, and boolean-"Whether" rules.

- [ ] **Step 14: Confirm existing unit tests still pass**

```powershell
npm test
```

Expected output: vitest runs the Task 3 suite and exits 0, with a summary containing:

```
 ✓ tests/mappers.test.ts
 Test Files  1 passed (1)
```

(No new tests in this task — declarative metadata is not unit-tested per the contract; it is verified by build + lint here and live API testing in Task 12.)

- [ ] **Step 15: Commit**

```powershell
git add nodes/Zaple/Zaple.node.ts nodes/Zaple/resources/catalog
git commit -m "feat: add Catalog resource"
```

Expected output: a line like `[main <shorthash>] feat: add Catalog resource` followed by `10 files changed` (9 new files + `Zaple.node.ts`).


### Task 9: Zaple Trigger node (TDD for the classifier)

**Files:**
- Test: `tests/classifyEvent.test.ts` (written FIRST — TDD)
- Create: `nodes/ZapleTrigger/classifyEvent.ts`
- Create: `nodes/ZapleTrigger/ZapleTrigger.node.ts`
- Modify: `package.json` (append the compiled trigger node to the `n8n.nodes` array)

**Interfaces:**
- Consumes (from Task 1): the icon files `icons/zaple.svg` and `icons/zaple.dark.svg`. The trigger node references them as `file:../../icons/zaple.svg` / `file:../../icons/zaple.dark.svg` — the exact same file references as the Zaple node in Task 4, and the relative paths are identical because `nodes/ZapleTrigger/` sits two directory levels below the project root, just like `nodes/Zaple/`. Also consumes the `npm test` script (`vitest run`) and the `vitest` devDependency from Task 1.
- Consumes (from `n8n-workflow`, available via the auto-installed peer dependency): `IDataObject`, `INodeType`, `INodeTypeDescription`, `IWebhookFunctions`, `IWebhookResponseData` types and the `NodeConnectionTypes` value.
- Consumes (from Task 4): the `package.json` `n8n.nodes` array in its Task 4 state, `["dist/nodes/Zaple/Zaple.node.js"]`.
- Produces from `nodes/ZapleTrigger/classifyEvent.ts` (pure module, unit-tested):
  - `export type ZapleEventType = 'messageStatus' | 'incomingMessage' | 'templateStatus' | 'unknown'`
  - `classifyZapleEvent(body: IDataObject): ZapleEventType`
- Produces from `nodes/ZapleTrigger/ZapleTrigger.node.ts`: `export class ZapleTrigger implements INodeType` with `description.name = 'zapleTrigger'`, registered in `package.json` as `dist/nodes/ZapleTrigger/ZapleTrigger.node.js`. Task 10 writes this node's codex file `nodes/ZapleTrigger/ZapleTrigger.node.json` next to it; Task 12 exercises the webhook against live Zaple traffic.

Background for the executor (no n8n or Zaple knowledge assumed): a *trigger* node starts a workflow instead of acting inside one — `group: ['trigger']`, `inputs: []`. Declaring a `webhooks` block makes n8n host an HTTP endpoint for the node and show two URLs in its UI: a **Test URL** (live only while the user clicks "Listen for test event") and a **Production URL** (live while the workflow is activated). Some services let nodes register webhooks programmatically via optional `webhookMethods` lifecycle hooks — Zaple has **no webhook-registration API** (the user pastes the URL into app.zaple.ai → Settings → Webhooks by hand), so this node deliberately omits `webhookMethods` entirely and instead shows a `type: 'notice'` property (a read-only instruction box rendered in the node panel) telling the user what to paste where. `responseMode: 'onReceived'` means n8n answers `200 OK` immediately on receipt. Each incoming POST invokes the class's `webhook()` method: returning `{ workflowData: [items] }` starts the workflow with those items; returning `{}` still acknowledges with 200 but starts nothing — that is how event filtering silently drops non-matching deliveries without Zaple seeing an error. The node has **no credentials**: Zaple pushes data to us and documents no signing secret, so there is nothing to verify — the notice (and the README in Task 10) tells users to treat the URL itself as a secret. Zaple forwards Meta/WhatsApp-native envelopes shaped `{object: 'whatsapp_business_account', entry: [{changes: [{field, value}]}]}`; which *kind* of event arrived is decided by inspecting `changes[].field` and the value's `statuses[]`/`messages[]` arrays. That decision logic is a pure function (`classifyZapleEvent`) with no n8n context, so per the contract it is built TDD: failing test first, then implementation. Anything the classifier cannot recognize — including the simpler `{event, timestamp, data}` shape one Zaple docs section shows — classifies as `'unknown'`, and `'unknown'` payloads are emitted **only** when the user selected All Events (`*`).

- [ ] **Step 1: Write the failing test FIRST.** Create `tests/classifyEvent.test.ts` (the `tests/` directory already exists from Task 3) with exactly this content. The six cases cover: a message-status envelope, an incoming button-reply message, a template status update, Zaple's simple `{event, data}` shape, an empty body, and an envelope whose entry lacks `changes`:

```ts
import { describe, expect, it } from 'vitest';

import { classifyZapleEvent } from '../nodes/ZapleTrigger/classifyEvent';

describe('classifyZapleEvent', () => {
	it("returns 'messageStatus' for a Meta envelope carrying value.statuses[]", () => {
		expect(
			classifyZapleEvent({
				object: 'whatsapp_business_account',
				entry: [
					{
						changes: [
							{
								field: 'messages',
								value: { statuses: [{ id: 'wamid.x', status: 'sent' }] },
							},
						],
					},
				],
			}),
		).toBe('messageStatus');
	});

	it("returns 'incomingMessage' for an envelope carrying value.messages[]", () => {
		expect(
			classifyZapleEvent({
				object: 'whatsapp_business_account',
				entry: [
					{
						changes: [
							{
								field: 'messages',
								value: {
									messages: [
										{ type: 'button', button: { payload: 'approve_67', text: 'Approve' } },
									],
								},
							},
						],
					},
				],
			}),
		).toBe('incomingMessage');
	});

	it("returns 'templateStatus' for a template status update envelope", () => {
		expect(
			classifyZapleEvent({
				object: 'whatsapp_business_account',
				entry: [
					{
						changes: [
							{
								field: 'message_template_status_update',
								value: { event: 'APPROVED' },
							},
						],
					},
				],
			}),
		).toBe('templateStatus');
	});

	it("returns 'unknown' for Zaple's simple {event, data} shape", () => {
		expect(classifyZapleEvent({ event: 'message.received', data: {} })).toBe('unknown');
	});

	it("returns 'unknown' for an empty body", () => {
		expect(classifyZapleEvent({})).toBe('unknown');
	});

	it("returns 'unknown' when entry is present but changes is missing", () => {
		expect(
			classifyZapleEvent({
				object: 'whatsapp_business_account',
				entry: [{ id: '104581129552342' }],
			}),
		).toBe('unknown');
	});
});
```

- [ ] **Step 2: Run the test and watch it FAIL** (proves the test exercises code that does not exist yet). Run from the project root `G:\Hardik Project\zaple-n8n`:

```
npm test
```

Expected: exit code 1. The Task 3 mappers suite still passes, but the new file fails to resolve its import, with output like:

```
 FAIL  tests/classifyEvent.test.ts [ tests/classifyEvent.test.ts ]
Error: Failed to resolve import "../nodes/ZapleTrigger/classifyEvent" from "tests/classifyEvent.test.ts". Does the file exist?
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  1 failed | 1 passed (2)
```

If `npm test` PASSES at this point, stop — something is wrong (the module cannot exist yet).

- [ ] **Step 3: Implement the classifier.** Create the directory `nodes/ZapleTrigger/` and the file `nodes/ZapleTrigger/classifyEvent.ts` with exactly this content (this is the contract's verbatim classifier — do not restyle it):

```ts
import type { IDataObject } from 'n8n-workflow';

export type ZapleEventType = 'messageStatus' | 'incomingMessage' | 'templateStatus' | 'unknown';

export function classifyZapleEvent(body: IDataObject): ZapleEventType {
	const entries = body.entry;
	if (body.object === 'whatsapp_business_account' && Array.isArray(entries)) {
		for (const entry of entries as IDataObject[]) {
			const changes = entry.changes;
			if (!Array.isArray(changes)) continue;
			for (const change of changes as IDataObject[]) {
				if (change.field === 'message_template_status_update') return 'templateStatus';
				if (change.field === 'messages') {
					const value = (change.value ?? {}) as IDataObject;
					if (Array.isArray(value.statuses)) return 'messageStatus';
					if (Array.isArray(value.messages)) return 'incomingMessage';
				}
			}
		}
	}
	return 'unknown';
}
```

- [ ] **Step 4: Run the test and watch it PASS.** Run:

```
npm test
```

Expected: exit code 0 with output like:

```
 ✓ tests/classifyEvent.test.ts (6 tests)
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

- [ ] **Step 5: Create the trigger node class.** Create `nodes/ZapleTrigger/ZapleTrigger.node.ts` with exactly this content. Notes on what the code does: `this.getBodyData()` returns the incoming POST's parsed JSON body as an `IDataObject`; `this.getNodeParameter('events', [])` reads the user's multi-select filter; `this.helpers.returnJsonArray(body)` wraps the raw body into n8n's item format (`INodeExecutionData[]`) so the workflow receives it as one item. A payload classified `'unknown'` never matches a specific selection — it is emitted only when `'*'` (All Events) is selected. The `options` list under `events` is alphabetized by `name` (an n8n lint rule):

```ts
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { classifyZapleEvent } from './classifyEvent';

export class ZapleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zaple Trigger',
		name: 'zapleTrigger',
		icon: { light: 'file:../../icons/zaple.svg', dark: 'file:../../icons/zaple.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Zaple webhook events arrive',
		defaults: { name: 'Zaple Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Copy the Production URL above and paste it into Zaple → Settings → Webhooks. Zaple does not sign webhook requests — treat this URL as a secret.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The Zaple webhook events that should start this workflow',
				options: [
					{
						name: 'All Events',
						value: '*',
						description: 'Emit every incoming webhook payload, including unrecognized shapes',
					},
					{
						name: 'Incoming Message / Button Reply',
						value: 'incomingMessage',
						description: 'A WhatsApp user sent a message or tapped a quick-reply button',
					},
					{
						name: 'Message Status Update',
						value: 'messageStatus',
						description: 'A sent message changed status: sent, delivered, read, or failed',
					},
					{
						name: 'Template Status Update',
						value: 'templateStatus',
						description: 'Meta approved or rejected a message template',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const events = this.getNodeParameter('events', []) as string[];
		const eventType = classifyZapleEvent(body);
		if (!events.includes('*') && !events.includes(eventType)) {
			return {};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
```

**Behavior decision (spec §5 amended):** payloads that are not Meta-envelope shaped (including Zaple's occasionally-documented `{event, timestamp, data}` shape) classify as `unknown` and are emitted only when **All Events** is selected. The README documents this. If real Zaple traffic uses the simple shape, add an `event`-key mapping in a minor release.

- [ ] **Step 6: Modify `package.json` — register the compiled trigger node.** n8n only loads nodes listed in the `n8n.nodes` array, and paths must point at the COMPILED `.js` file under `dist/`. Change ONLY the `nodes` array (keep everything else in `package.json` untouched, and match the file's existing indentation).

Before:

```json
	"n8n": {
		"n8nNodesApiVersion": 1,
		"strict": true,
		"credentials": [
			"dist/credentials/ZapleApi.credentials.js",
			"dist/credentials/ZapleLeadsApi.credentials.js"
		],
		"nodes": [
			"dist/nodes/Zaple/Zaple.node.js"
		]
	}
```

After:

```json
	"n8n": {
		"n8nNodesApiVersion": 1,
		"strict": true,
		"credentials": [
			"dist/credentials/ZapleApi.credentials.js",
			"dist/credentials/ZapleLeadsApi.credentials.js"
		],
		"nodes": [
			"dist/nodes/Zaple/Zaple.node.js",
			"dist/nodes/ZapleTrigger/ZapleTrigger.node.js"
		]
	}
```

This is the FINAL state of the `n8n` block — no later task modifies it.

- [ ] **Step 7: Build, lint, and test.** Run each command from the project root and confirm exit code 0 for all three:

```
npm run build
```

Expected: exit code 0; `n8n-node build` compiles with no TS errors. Verify the compiled trigger node exists:

```
node -e "console.log(require('fs').existsSync('dist/nodes/ZapleTrigger/ZapleTrigger.node.js'))"
```

Expected output:

```
true
```

```
npm run lint
```

Expected: exit code 0 with no reported problems. If it reports unsorted-options or missing-description errors on the `events` property, fix the flagged option in place — the code in Step 5 is written to satisfy the alphabetization and description rules.

```
npm test
```

Expected: exit code 0 with the same summary as Step 4:

```
 ✓ tests/classifyEvent.test.ts (6 tests)
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

- [ ] **Step 8: Commit.** Run these two commands:

```
git add package.json tests/classifyEvent.test.ts nodes/ZapleTrigger
git commit -m "feat: add Zaple Trigger webhook node"
```

Expected: exit code 0, output like `[main <shorthash>] feat: add Zaple Trigger webhook node` reporting `4 files changed` (`tests/classifyEvent.test.ts`, `nodes/ZapleTrigger/classifyEvent.ts`, `nodes/ZapleTrigger/ZapleTrigger.node.ts`, `package.json`; `dist/` is git-ignored).


### Task 10: Codex files, README, CHANGELOG

**Files:**
- Create: `nodes/Zaple/Zaple.node.json`
- Create: `nodes/ZapleTrigger/ZapleTrigger.node.json`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Modify: none
- Test: none (verified by `npm run build` and `npm run lint` — the n8n lint ruleset validates codex JSON files)

**Interfaces:**
- Consumes (from Task 1): the package name `n8n-nodes-zaple` from `package.json` — codex `"node"` values are `<package name>.<node name>`.
- Consumes (from Task 4): `export class Zaple implements INodeType` with `description.name = 'zaple'` in `nodes/Zaple/Zaple.node.ts` — the codex file must sit next to it with the same basename (`Zaple.node.json`).
- Consumes (from Task 9): `export class ZapleTrigger implements INodeType` with `description.name = 'zapleTrigger'` in `nodes/ZapleTrigger/ZapleTrigger.node.ts` — same sidecar rule (`ZapleTrigger.node.json`).
- Produces: `nodes/Zaple/Zaple.node.json` and `nodes/ZapleTrigger/ZapleTrigger.node.json`, which `n8n-node build` copies into `dist/` next to the compiled node files; `README.md`, which npm shows on the package page and which n8n's verification review (Task 14) requires to document auth + usage; `CHANGELOG.md` with the 0.1.0 release entry (Task 13 tags exactly this version).

Background for the executor: a "codex" file is a JSON sidecar that MUST have the exact same basename as its node class file (`Zaple.node.json` next to `Zaple.node.ts`). n8n reads it to place the node in a category in the node-panel UI and to link to documentation from the node's and credential's help panels. The `"node"` value is `<npm package name>.<node name property>` — note the second half is the node's `name` property (`zaple`, `zapleTrigger`), NOT the class name. `nodeVersion`/`codexVersion` are schema version markers and stay `"1.0"`. The README is not decoration: n8n's verification checklist requires it to document installation, credentials, and operations, and it is the only place users learn about Zaple's API quirks (three different `template_id` meanings, unsigned webhooks, business error codes), so its content below is spelled out completely and must be used verbatim.

- [ ] **Step 1: Create `nodes/Zaple/Zaple.node.json`** with exactly this content (tabs for indentation, matching `.prettierrc.js`):

```json
{
	"node": "n8n-nodes-zaple.zaple",
	"nodeVersion": "1.0",
	"codexVersion": "1.0",
	"categories": ["Communication"],
	"resources": {
		"credentialDocumentation": [
			{
				"url": "https://zaple.ai/docs/"
			}
		],
		"primaryDocumentation": [
			{
				"url": "https://zaple.ai/docs/"
			}
		]
	}
}
```

- [ ] **Step 2: Create `nodes/ZapleTrigger/ZapleTrigger.node.json`** with exactly this content — identical shape, only the `"node"` value differs:

```json
{
	"node": "n8n-nodes-zaple.zapleTrigger",
	"nodeVersion": "1.0",
	"codexVersion": "1.0",
	"categories": ["Communication"],
	"resources": {
		"credentialDocumentation": [
			{
				"url": "https://zaple.ai/docs/"
			}
		],
		"primaryDocumentation": [
			{
				"url": "https://zaple.ai/docs/"
			}
		]
	}
}
```

- [ ] **Step 3: Create `README.md`** at the project root with exactly this content (the outer fence below is four backticks because the README itself contains three-backtick code blocks — copy everything between the four-backtick markers):

````markdown
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
````

- [ ] **Step 4: Create `CHANGELOG.md`** at the project root with exactly this content:

```markdown
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
```

- [ ] **Step 5: Build.** Run from the project root `G:\Hardik Project\zaple-n8n`:

```
npm run build
```

Expected: exit code 0. `n8n-node build` copies the codex files into `dist/` next to the compiled node files. Verify:

```
node -e "const fs=require('fs');console.log(fs.existsSync('dist/nodes/Zaple/Zaple.node.json') && fs.existsSync('dist/nodes/ZapleTrigger/ZapleTrigger.node.json'))"
```

Expected output:

```
true
```

- [ ] **Step 6: Lint.** Run:

```
npm run lint
```

Expected: exit code 0 with no reported problems — the n8n community-node ruleset also validates the two codex `.node.json` files (correct `"node"` value format, known category names, resource URL shape). If it flags a codex file, compare against Steps 1–2 character by character; the content above satisfies the rules.

- [ ] **Step 7: Test.** Run:

```
npm test
```

Expected: exit code 0 with output like:

```
 ✓ tests/classifyEvent.test.ts (6 tests)
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

This task adds no tests; the run confirms the existing suites still pass so the repo stays green.

- [ ] **Step 8: Commit.** Run these two commands:

```
git add nodes/Zaple/Zaple.node.json nodes/ZapleTrigger/ZapleTrigger.node.json README.md CHANGELOG.md
git commit -m "docs: add codex metadata, README, CHANGELOG"
```

Expected: exit code 0, output like `[main <shorthash>] docs: add codex metadata, README, CHANGELOG` reporting `4 files changed` (the two codex files, `README.md`, `CHANGELOG.md`; `dist/` is git-ignored).

### Task 11: CI/CD workflows + full quality gates

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`
- Modify: none
- Test: none new — this task RUNS the complete local quality-gate suite (`npm run lint`, `npm test`, `npm run build`, package scan, zero-dependency check) over the finished codebase

**Interfaces:**
- Consumes (from Task 1): the npm scripts `lint` (`n8n-node lint`), `test` (`vitest run`), `build` (`n8n-node build`), and `release` (`n8n-node release`) in `package.json`; `"files": ["dist"]` and the absence of a `dependencies` key.
- Consumes (from Tasks 2–10): the complete source tree — both credentials, both nodes, both codex files, all 5 resource description modules, shared mappers/preSend functions, both test suites, README and CHANGELOG.
- Produces: `.github/workflows/ci.yml` — runs lint + tests + build on every push to `main` and on every pull request once Task 13 pushes the repo to GitHub; `.github/workflows/publish.yml` — publishes to npm with provenance when Task 13 pushes the release tag (the tag pattern `*.*.*` matches both `0.1.0` and `v0.1.0`). Task 13's npm Trusted Publisher registration references this exact workflow filename, `publish.yml`.

Background for the executor: GitHub Actions workflows are YAML files under `.github/workflows/` that GitHub runs automatically on repository events. They cannot be executed locally — their first real run happens in Task 13 when the repo is pushed — so this task's verification is (a) creating them with exactly the content below and (b) running the equivalent quality gates locally. The publish workflow is verification-critical: since 2026-05-01, n8n only verifies community packages published with **npm provenance** (a signed attestation linking the published tarball to the exact GitHub commit and workflow that built it). `permissions: id-token: write` lets the job mint a GitHub OIDC token; npm's **Trusted Publisher** mechanism (configured on npmjs.com in Task 13) accepts that token as authentication AND generates the provenance attestation — no long-lived npm token is needed. Publishing happens ONLY through this workflow, never via `npm publish` from a local machine (global constraint). The `npm ci` step (as opposed to `npm install`) installs exactly what `package-lock.json` pins, which is why the lockfile was committed in Task 1.

- [ ] **Step 1: Create `.github/workflows/ci.yml`.** Create the directories `.github/workflows/` at the project root, then the file with exactly this content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npm test

      - run: npm run build
```

- [ ] **Step 2: Create `.github/workflows/publish.yml`** with exactly this content. Note the commented-out `env` block: it is the deliberate fallback path, kept as a comment because OIDC Trusted Publishing (configured in Task 13) needs no token at all.

```yaml
name: Publish

on:
  push:
    tags:
      - '*.*.*'

permissions:
  contents: read
  id-token: write # lets the job mint the OIDC token npm uses for Trusted Publishing + provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      # Primary auth: npm Trusted Publisher (OIDC), configured on npmjs.com in Task 13 —
      # once this repo + this workflow file are registered there, NO token or secret is needed.
      # Fallback ONLY if Trusted Publishing cannot be configured: create an npm automation
      # token, save it as the repository secret NPM_TOKEN, and uncomment the env block below.
      - run: npm run release
        # env:
        #   NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Gate 1 — lint.** Run from the project root `G:\Hardik Project\zaple-n8n`:

```
npm run lint
```

Expected: exit code 0 with no reported problems across the entire codebase (credentials, both nodes, all resource modules, codex files).

- [ ] **Step 4: Gate 2 — unit tests.** Run:

```
npm test
```

Expected: exit code 0 with output like:

```
 ✓ tests/classifyEvent.test.ts (6 tests)
 ✓ tests/mappers.test.ts (9 tests)
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

- [ ] **Step 5: Gate 3 — build + dist inventory.** Run:

```
npm run build
```

Expected: exit code 0. Then verify `dist/` contains everything n8n needs at runtime — both compiled credentials, both compiled nodes, both codex files, and both icons:

```
node -e "const fs=require('fs');const must=['dist/credentials/ZapleApi.credentials.js','dist/credentials/ZapleLeadsApi.credentials.js','dist/nodes/Zaple/Zaple.node.js','dist/nodes/Zaple/Zaple.node.json','dist/nodes/ZapleTrigger/ZapleTrigger.node.js','dist/nodes/ZapleTrigger/ZapleTrigger.node.json','dist/icons/zaple.svg','dist/icons/zaple.dark.svg'];const missing=must.filter((f)=>!fs.existsSync(f));console.log(missing.length?'MISSING: '+missing.join(', '):'dist OK');"
```

Expected output:

```
dist OK
```

If ONLY the two icon paths are reported missing, run `ls dist` to see where `n8n-node build` placed the copied icons and confirm they resolve from the compiled node files: both node classes reference `file:../../icons/zaple.svg`, which from `dist/nodes/Zaple/Zaple.node.js` resolves to `dist/icons/zaple.svg` — the icons MUST end up there. If they are not in `dist/` at all, confirm `icons/zaple.svg` and `icons/zaple.dark.svg` exist at the project root (Task 1 Step 7) and rebuild; do not proceed until the check prints `dist OK`.

- [ ] **Step 6: Gate 4 — community-package scan.** n8n's scanner checks a package against the verification security rules (no runtime deps, no env/fs access, valid structure). IMPORTANT: `npx @n8n/scan-community-package n8n-nodes-zaple` downloads the named package from the **npm registry** — the package is not published yet, so scan the local pack instead. First build the tarball:

```
npm pack
```

Expected: exit code 0; the command prints an `npm notice` block listing the tarball contents and creates `n8n-nodes-zaple-0.1.0.tgz` in the project root. Inspect the printed file list — the pass criteria are: every listed path is `package.json`, `README.md`, `LICENSE.md`, or under `dist/`; NO `.ts` sources, no `tests/`, no `.github/`, no `node_modules/`. (Sizes and file counts in the notice vary; the file *set* is what matters.) Then run the scanner against the local tarball:

```
npx @n8n/scan-community-package ./n8n-nodes-zaple-0.1.0.tgz
```

Two acceptable outcomes:

1. The scanner accepts the local path and reports success (all checks passed) — gate passed.
2. The scanner errors because it only supports **published** package names (e.g. it tries a registry lookup of the path and fails). This is a documented limitation, not a failure: the same scan re-runs in Task 13 against the real published package (`npx @n8n/scan-community-package n8n-nodes-zaple`) as a hard post-publish gate, and the pre-publish equivalent has already passed — `npm run lint` (Step 3) bundles the same community-package ruleset.

Either way, delete the tarball so it is not committed:

```
rm n8n-nodes-zaple-0.1.0.tgz
```

Expected: exit code 0, no output.

- [ ] **Step 7: Gate 5 — zero runtime dependencies.** This is a hard n8n verification rule. Run:

```
npm ls --omit=dev --depth=0
```

Expected output (version numbers vary):

```
n8n-nodes-zaple@0.1.0 G:\Hardik Project\zaple-n8n
`-- n8n-workflow@1.x.x
```

Pass criterion: besides the package's own header line, the output is either completely `(empty)` or lists ONLY `n8n-workflow` — that entry is the peer dependency (npm 7+ auto-installs peers locally; n8n itself provides it at runtime, so it is NOT a runtime dependency of this package). Any other entry means a runtime dependency crept in — remove it before proceeding. Then run the definitive check that `package.json` has no `dependencies` key at all:

```
node -e "const p=require('./package.json');console.log('dependencies' in p ? 'FAIL: runtime dependencies present' : 'no runtime dependencies');"
```

Expected output:

```
no runtime dependencies
```

- [ ] **Step 8: Commit.** Run these two commands:

```
git add .github
git commit -m "ci: add CI and provenance publish workflows"
```

Expected: exit code 0, output like `[main <shorthash>] ci: add CI and provenance publish workflows` reporting `2 files changed` (`.github/workflows/ci.yml`, `.github/workflows/publish.yml`).


### Task 12: Live API testing with real credentials

**Files:**
- Modify: `nodes/Zaple/resources/message/sendService.ts` (Latitude description cleanup in Step 19 — both branches)
- Modify (ONLY if the matching contingency fires — see Steps 16–19): `nodes/Zaple/shared/preSendFunctions.ts`, `nodes/Zaple/resources/batch/index.ts`, `nodes/Zaple/resources/catalog/index.ts`, `nodes/Zaple/resources/message/index.ts`
- Modify (if live behavior differed from what the README documents): `README.md`
- Test: manual live-API verification of every operation in the checklist below against `https://app.zaple.ai` with Hardik's real credentials. No new unit tests; after ANY contingency code edit, re-run `npm test`, `npm run lint`, and `npm run build` (all must exit 0).

**Interfaces:**
- Consumes (from Task 1): the `npm run dev` script (`n8n-node dev` — builds in watch mode and launches a local n8n with this package hot-loaded).
- Consumes (from Task 2): the credential types `zapleApi` (headers `Zaple-Api-Key`/`Zaple-Api-Secret`; credential test = `GET https://app.zaple.ai/api/v3/templates?per_page=1`) and `zapleLeadsApi` (headers `X-Zaple-Api-Key`/`X-Zaple-Api-Secret`; no credential test).
- Consumes (from Tasks 4–8): the `Zaple` node with all 5 resources / 28 operations; (from Task 9): the `ZapleTrigger` node; (from Task 10): `README.md`.
- Produces (ONLY if the matching contingency fires) from `nodes/Zaple/shared/preSendFunctions.ts`:
  - `encodeAsFormData(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>` (contingency 1)
  - `mapServiceLocation(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>` (contingency 4)
- Produces otherwise: no new code interfaces — the output of this task is a live-verified endpoint map and the commit trail of any fixes.

Background for the executor (no n8n or Zaple knowledge assumed): everything before this task was verified only by compiler, linter, and unit tests — nobody has yet sent a real HTTP request to Zaple. This task runs the node against the LIVE Zaple API with Hardik's real account. `npm run dev` starts a full local n8n instance in the browser with this package linked in; you build tiny two-node workflows there (a Manual Trigger connected to a Zaple node), click "Execute workflow", and read the JSON output panel of the Zaple node. n8n shows the response BODY of the API call as the node's output item (not the HTTP status code); when the API returns a non-2xx status, the node instead shows a red error box whose details contain the status code and the API's error body — for the negative tests below, that red error IS the expected outcome. Four points in the Zaple docs were ambiguous (flagged in the approved spec §4.1/§7); Steps 16–19 resolve each one against the live API and apply a pre-planned code fix if the shipped guess turns out wrong. Real WhatsApp messages will be sent to Hardik's own phone — costs count against the Zaple account's balance/plan, so keep sends to the minimum the checklist requires. Throughout this task, keep a scratch text note of every call that returned a non-2xx response or a surprising body shape — Steps 16–20 consume that note.

- [ ] **Step 1: Gather test prerequisites**

Collect the following before starting (ask Hardik for anything missing):

1. **Main API credentials**: API Key + API Secret from app.zaple.ai → Settings → API & Developer.
2. **Leads API credentials**: Lead API Key (`zpl_lead_…`) + Lead API Secret (`zpls_…`) from the Zaple Leads settings. The secret is shown only at create/rotate time — if Hardik does not have it recorded, rotate the key in the Zaple UI and record the new pair.
3. **Test phone**: Hardik's own WhatsApp number, split into country code (e.g. `91`) and the number without country code. This phone must be physically at hand to verify message receipt.
4. **An APPROVED, ACTIVE template** in the Zaple account whose body contains at least two variables (`{{1}}`, `{{2}}`) and which has at least one quick-reply button. Record its **send-API template identifier** (the ID shown in the Zaple template library, NOT the numeric database ID). If no such template exists, create one in the Zaple dashboard now and wait for Meta approval before Step 7 (approval usually takes minutes to hours; all other steps can proceed meanwhile using any approved template).
5. Create an empty scratch note (e.g. `live-test-notes.txt` OUTSIDE the repo, or a piece of paper) to record IDs returned by the API (template ID, message ID, list ID, batch ID, lead ID) and every anomaly observed.

Expected outcome: all five items available.

- [ ] **Step 2: Start the local dev n8n**

From the project root `G:\Hardik Project\zaple-n8n`:

```powershell
npm run dev
```

Expected output: `n8n-node dev` builds the package in watch mode, downloads/boots a local n8n (first run can take a few minutes), and prints the editor URL, e.g.:

```
Editor is now accessible via:
http://localhost:5678
```

Open `http://localhost:5678` in a browser. On first boot n8n asks you to create a local owner account — use any email/password (this is a throwaway local instance). Confirm the package is hot-loaded: create a new workflow, click the `+` node button, search for "Zaple" — both **Zaple** and **Zaple Trigger** must appear in the results. Leave this terminal running for the whole task; the node rebuilds automatically when a source file changes (contingency steps rely on this).

If the port differs (5678 busy), n8n prints the alternative URL — use that everywhere below.

- [ ] **Step 3: Create the Zaple API credential and pass the credential test**

In the n8n editor: add a **Zaple** node to a workflow → in its *Credential to connect with* dropdown choose **Create new credential** → the "Zaple API" credential form opens (two fields: API Key, API Secret — both masked). Paste the real key and secret from Step 1 and click **Save**.

Expected outcome: n8n automatically runs the credential test (which issues `GET https://app.zaple.ai/api/v3/templates?per_page=1` with the two `Zaple-Api-*` headers) and shows the green message **"Connection tested successfully"**. If it shows a red error instead: re-check the key/secret for copy-paste whitespace; if the values are definitely correct and the test still fails, record the exact error body in the scratch note before continuing (and re-verify the header names against the Zaple dashboard's API docs).

- [ ] **Step 4: Live test — Template List**

Build a tiny workflow: **Manual Trigger** node ("Trigger manually") → **Zaple** node (Resource: `Template`, Operation: `List`, credential from Step 3; leave all filters empty). Click **Execute workflow**.

Expected outcome: the Zaple node outputs one item whose JSON contains `"status": "success"` and a `templates` array of template objects. Record in the scratch note: the **send-API template identifier** of the Step 1 template (confirm it appears in this list) and of any other APPROVED template.

- [ ] **Step 5: Live test — Template Get + Preview**

In the same workflow, switch the Zaple node to Resource: `Template`, Operation: `Get`, and set **Template ID** to a send-API identifier recorded in Step 4. Execute.

Expected outcome: one item containing that template's details (title, category, language, content/body with `{{1}}`-style variables, status APPROVED).

Then switch Operation to `Preview` (same Template ID). Execute.

Expected outcome: one item containing the rendered preview of the template (the body text, header/footer/buttons as configured).

- [ ] **Step 6: Live test — Send Template Message (basic)**

New workflow: Manual Trigger → Zaple (Resource: `Message`, Operation: `Send Template Message`). Set **Template ID** to an approved template's send-API identifier, **Country Code** to Hardik's country code (e.g. `91`), **Send To** to Hardik's number without country code. Leave Template Arguments / Quick Reply Payloads / Media empty (if the chosen template has body variables, fill exactly as many Template Arguments as the template needs). Execute.

Expected outcome: one item whose JSON contains a `message_id` (record it in the scratch note), and within a few seconds the template message arrives on Hardik's WhatsApp phone. If the node errors with a business error such as `daily_limit_reached`, `plan_expired`, or `insufficient_balance`, resolve the account-side issue in the Zaple dashboard and re-execute — these are not node bugs.

- [ ] **Step 7: Live test — Send Template Message with 2 arguments + quick-reply payload**

Same workflow; switch Template ID to the Step 1 template (2 body variables + quick-reply button). Under **Template Arguments** click *Add Argument* twice and enter two distinctive values (e.g. `FIRST-ARG` and `SECOND-ARG`). Under **Quick Reply Payloads** click *Add Payload* once and enter `test_payload_1`. Execute.

Expected outcome: one item with a `message_id`; the message arrives on the phone with `FIRST-ARG` substituted where the template has `{{1}}` and `SECOND-ARG` where it has `{{2}}` (verify visually on the phone), and the quick-reply button renders. This proves the `mapTemplateArguments`/`mapQuickReplyPayloads` preSend functions produce the numbered keys (`template_argument1`, `template_argument2`, `quick_reply_payload1`) the API expects. If the API instead complains about missing template arguments, record the exact error body in the scratch note — that indicates the numbered-field mapping needs investigation (check the request body via the node's error details before assuming the API is at fault).

- [ ] **Step 8: Live test — Send Service Message (text)**

NOTE: WhatsApp only allows free-form ("service") messages inside an open 24-hour customer-service window. **Open the window first:** from Hardik's test phone, send any WhatsApp message (e.g. "hi") as a REPLY to the business number (the number the Step 6 template arrived from). Wait for it to show as delivered.

Then: Manual Trigger → Zaple (Resource: `Message`, Operation: `Send Service Message`). Country Code / Send To = same test phone; **Type** = `Text`; **Text** = `n8n live test — service message`. Execute.

Expected outcome: one item containing a success indicator/`message_id`, and the text arrives on the phone as a plain (non-template) message. If the node errors with a "window closed"/"24 hour" style error, the reply from the phone did not register — send it again and retry. If the node errors with a 422/400 validation error even though all fields were filled, that is contingency-1 territory: record it and resolve in Step 16.

- [ ] **Step 9: Live test — Batch: Create Contact List + Upsert Contacts**

Manual Trigger → Zaple (Resource: `Batch`, Operation: `Create Contact List`), **Name** = `n8n live test list`. Execute.

Expected outcome: one item containing the new list's ID (record it as LIST_ID). If Zaple returns a `duplicate_list_name` error, a previous run left the list behind — either use a fresh name or find and reuse the existing list's ID.

Then switch the node to Operation: `Upsert Contacts`, **List ID** = LIST_ID, **Input Mode** = `Fields Below`, and under **Contacts** add 1–2 contacts — the first one MUST be Hardik's own number (Country Code e.g. `91`, Phone Number without country code, Name `Hardik`). Execute.

Expected outcome: one item confirming the contacts were added/updated (e.g. a success status with a count). This exercises the `mapBatchContacts` preSend (UI rows → snake_case `contacts[]` array).

- [ ] **Step 10: Live test — Batch: Send Batch + Get Status**

Switch the node to Operation: `Send Batch`. **Template ID** = an approved template's send-API identifier (use a template with NO body variables if available — batch sends fill no per-contact arguments in this test), **List ID** = LIST_ID, **Scheduled** = off (sends immediately with `scheduled_enabled: false`). Execute.

Expected outcome: one item containing a batch identifier (record it as BATCH_ID) and the template message arrives on Hardik's phone (he is in the list).

Then switch to Operation: `Get Batch Status`, **Batch ID** = BATCH_ID. Execute; if the status reports the batch as still queued/processing, wait ~30 seconds and execute again until it reports completed.

Expected outcome: one item with the batch's processing status, reaching a completed state (a 1–2 contact batch completes within a minute). **If this call returns a 404 error, that is contingency 2 — record it and resolve in Step 17 before continuing.**

- [ ] **Step 11: Live test — Batch: Get Details + Delete Batch negative test**

Switch to Operation: `Get Batch Details`, **Batch ID** = BATCH_ID. Execute.

Expected outcome: one item with the paginated per-recipient results — an entry for each contact upserted in Step 9 with its delivery status. (A `batch_not_completed` error means Step 10 was not actually finished — poll status again first. A 404 is contingency 2 → Step 17.)

Then switch to Operation: `Delete Batch`, **Batch ID** = BATCH_ID. Execute.

Expected outcome: the node FAILS with a red error — this is the expected result. Open the error details: the API response must be a 4xx whose body contains a `deletion_not_allowed`-style error (only future scheduled batches are deletable, and this batch already completed). Record the exact error string in the scratch note (Task 10's README error table can be cross-checked in Step 20). The fact that the API answered with a business error (not a route-level 404) also confirms the `DELETE /api/v2/messages/batch/{batch_id}` path resolves.

- [ ] **Step 12: Live test — Batch: Delete List (scratch list)**

Do NOT delete the Step 9 list yet if you want to keep it for re-runs; instead prove the delete path on a scratch list: Operation: `Create Contact List`, **Name** = `n8n scratch delete test`. Execute; record the returned ID as SCRATCH_LIST_ID. Then Operation: `Delete List`, **List ID** = SCRATCH_LIST_ID. Execute.

Expected outcome: create succeeds, delete returns a success confirmation (API-created lists are deletable). Finally, clean up the Step 9 list the same way (Operation: `Delete List`, List ID = LIST_ID) — expected: success.

- [ ] **Step 13: Live test — Lead Submit (with idempotency check)**

Add a new Zaple node (or switch the existing one) to Resource: `Lead`, Operation: `Submit`. n8n now asks for the **Zaple Leads API** credential (a different credential type — the resource is gated to it): choose **Create new credential**, paste the Lead API Key + Lead API Secret from Step 1, Save (this credential type has no automatic test — the save succeeds without a connection check).

Set **Phone** = Hardik's full number, and under **Additional Fields** add **Full Name** = `n8n Live Test`, **External Event ID** = `n8n-live-test-001`. Execute.

Expected outcome: one item whose body indicates the lead was captured (HTTP 201 under the hood — n8n shows the body; expect a success status with a message like "Lead captured" and the new lead's ID). Record the lead ID.

Execute the exact same node again (same `external_event_id`).

Expected outcome: NOT a duplicate — the API answers 200 with an "already processed" style body carrying the SAME lead ID as before, proving `external_event_id` idempotency. If instead a second lead is created, record it: the README's idempotency claim must be corrected in Step 20.

- [ ] **Step 14: Live test — Catalog: Get Many + Get Commerce Settings**

Manual Trigger → Zaple (Resource: `Catalog`, Operation: `Get Many`, `zapleApi` credential). Execute.

Expected outcome: one item with the account's catalog list (an empty array is a PASS if the account has no catalogs).

Then switch to Operation: `Get Commerce Settings`. Execute.

Expected outcome: one item with the account's WhatsApp commerce settings object. **If this call returns a 404 error, that is contingency 3 — record it and resolve in Step 18.**

- [ ] **Step 15: Live test — Zaple Trigger (Message Status Update)**

The local n8n runs on `localhost`, which Zaple's servers cannot reach, so expose it through a tunnel first:

1. In a SECOND terminal run:

```powershell
npx localtunnel --port 5678
```

Expected output: `your url is: https://<subdomain>.loca.lt` (the subdomain is random — copy the printed URL). Keep this terminal running. (Alternative if localtunnel is blocked: `cloudflared tunnel --url http://localhost:5678` prints an equivalent `https://….trycloudflare.com` URL.)

2. Restart the dev n8n so it generates webhook URLs on the tunnel host: in the Step 2 terminal press `Ctrl+C`, then run:

```powershell
$env:WEBHOOK_URL = 'https://<subdomain>.loca.lt/'
npm run dev
```

(with the actual printed tunnel URL; the trailing slash matters). Wait for the editor URL to print again and reload the browser.

3. In n8n: create a new workflow named `Zaple Trigger Live Test`; add a **Zaple Trigger** node; under **Events** tick **Message Status Update**. Save the workflow, then switch the **Active** toggle (top right) to on. Open the trigger node and copy the **Production URL** from its Webhooks panel — it must start with `https://<subdomain>.loca.lt/` (if it still says `localhost`, the `WEBHOOK_URL` variable did not reach n8n — redo item 2 in the same terminal session).

4. In app.zaple.ai → Settings → Webhooks: paste the Production URL and save.

5. Send a template message: re-open the Step 6 workflow and execute it once.

6. In n8n, open **Executions** (left sidebar) and filter by the `Zaple Trigger Live Test` workflow.

Expected outcome: within ~a minute, at least one new execution appears (Zaple posts `sent`/`delivered`/`read` status updates as the message progresses). Open it: the output item's JSON is a Meta-style envelope with `object: "whatsapp_business_account"` and `entry[0].changes[0].value.statuses[]` containing the status and the message ID from item 5. This proves classification and filtering work live.

7. Clean up: in app.zaple.ai → Settings → Webhooks remove the tunnel URL (it dies when the tunnel terminal closes; Task 13 Step 10 installs the permanent server URL). Deactivate the test workflow and stop the tunnel terminal.

Fallback: if no tunnel service is reachable from this machine, SKIP this step now, note "trigger live test deferred to Task 13 Step 10" in the scratch note, and perform items 3–6 on Hardik's public n8n server after the Task 13 install instead — the trigger MUST be live-verified before Task 14 submits for verification.

- [ ] **Step 16: Ambiguity resolution 1 — JSON acceptance on v2 endpoints**

**What to observe:** review the scratch note for every `/api/v2/…` call executed above (send-service-message in Step 8; lists/contacts in Steps 9 and 12; messages/batch in Steps 10–11; catalogs and commerce settings in Step 14). The node sends all bodies as JSON (`Content-Type: application/json`). The suspicious signature is a **422 or 400 response claiming required fields are missing or invalid even though the node visibly sent them** (open the failed node's error details and check the request body) — that means the endpoint ignores JSON bodies and expects `application/x-www-form-urlencoded`.

**If every v2 call above succeeded (or failed only with business errors like `deletion_not_allowed` / window-closed):** JSON is accepted — check this step off with no code change and skip to Step 17.

**If a v2 endpoint rejected a valid JSON body:** apply the pre-planned contingency:

1. Append the following function to the END of `nodes/Zaple/shared/preSendFunctions.ts` (after the closing brace of `sendJsonField`; the file's existing imports — `IDataObject`, `IExecuteSingleFunctions`, `IHttpRequestOptions` — already cover everything it needs; `URLSearchParams` is a Node.js global):

```ts
export async function encodeAsFormData(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;
	const form = new URLSearchParams();
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			value.forEach((item, i) => form.append(key + '[' + i + ']', String(item)));
		} else if (typeof value === 'object') {
			form.append(key, JSON.stringify(value));
		} else {
			form.append(key, String(value));
		}
	}
	requestOptions.body = form.toString();
	requestOptions.headers = {
		...requestOptions.headers,
		'Content-Type': 'application/x-www-form-urlencoded',
	};
	return requestOptions;
}
```

2. Attach it to the FAILING operation only (not blanket to all v2 ops), appended **LAST** in that operation's `preSend` array so it re-encodes the fully built body. Two concrete cases:

If the failing operation already has a `preSend` array (example: Batch → Upsert Contacts in `nodes/Zaple/resources/batch/index.ts`) — append to it. Before:

```ts
					send: { preSend: [mapBatchContacts] },
```

After:

```ts
					send: { preSend: [mapBatchContacts, encodeAsFormData] },
```

If the failing operation has no `send` block (example: Batch → Create Contact List in `nodes/Zaple/resources/batch/index.ts`) — add one. Before:

```ts
				routing: { request: { method: 'POST', url: '/api/v2/lists' } },
```

After:

```ts
				routing: {
					request: { method: 'POST', url: '/api/v2/lists' },
					send: { preSend: [encodeAsFormData] },
				},
```

(For Message → Send Service Message in `nodes/Zaple/resources/message/index.ts` the same append-last rule gives `preSend: [mapMediaFields, mapTemplateArguments, encodeAsFormData]`.)

3. Update that resource `index.ts`'s import from `'../../shared/preSendFunctions'` to include `encodeAsFormData`, keeping named imports alphabetized. Example for `nodes/Zaple/resources/batch/index.ts` — before:

```ts
import { mapBatchContacts } from '../../shared/preSendFunctions';
```

After:

```ts
import { encodeAsFormData, mapBatchContacts } from '../../shared/preSendFunctions';
```

4. Re-run the failing call in the n8n editor (the dev server hot-reloads the rebuilt node; if the node panel behaves stale, refresh the browser). Expected: the operation now succeeds.

5. Verify the gates and commit:

```powershell
npm test
npm run lint
npm run build
git add nodes/Zaple/shared/preSendFunctions.ts nodes/Zaple/resources
git commit -m "fix: form-encode v2 request bodies rejected as JSON"
```

Expected: all three commands exit 0; commit output like `[main <shorthash>] fix: form-encode v2 request bodies rejected as JSON`.

- [ ] **Step 17: Ambiguity resolution 2 — batch status/details path**

**What to observe:** Steps 10–11. The node uses the cURL-verified paths `GET /api/v2/messages/batch/{batch_id}/status` and `…/details`. The docs' section headings suggested `GET /api/v2/batch/{batch_id}/status` instead.

**If Get Batch Status and Get Batch Details both returned data in Steps 10–11:** the shipped paths are correct — check this step off with no code change.

**If either call returned a 404 (route not found):** switch to the heading variant in `nodes/Zaple/resources/batch/index.ts`. Two one-line diffs:

In the `Get Batch Status` option — before:

```ts
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/status',
```

After:

```ts
						url: '=/api/v2/batch/{{$parameter.batchId}}/status',
```

In the `Get Batch Details` option — before:

```ts
						url: '=/api/v2/messages/batch/{{$parameter.batchId}}/details',
```

After:

```ts
						url: '=/api/v2/batch/{{$parameter.batchId}}/details',
```

(Leave Send Batch `/api/v2/messages/batch` and Delete Batch `=/api/v2/messages/batch/{{$parameter.batchId}}` untouched unless they ALSO 404'd — Step 10's successful send and Step 11's `deletion_not_allowed` business error already prove those routes resolve.)

Then: re-run Get Batch Status and Get Batch Details in the editor with the recorded BATCH_ID (expected: both now return data), and verify + commit:

```powershell
npm test
npm run lint
npm run build
git add nodes/Zaple/resources/batch/index.ts
git commit -m "fix: use /api/v2/batch/{id} paths for batch status and details"
```

Expected: all three commands exit 0; commit output like `[main <shorthash>] fix: use /api/v2/batch/{id} paths for batch status and details`.

- [ ] **Step 18: Ambiguity resolution 3 — commerce settings path**

**What to observe:** Step 14's Get Commerce Settings call. The node uses the docs' cURL path `GET /api/v2/commerce/settings`; the docs' heading suggested `GET /api/v2/catalogs/commerce-settings`.

**If Step 14 returned a settings object:** the shipped path is correct — check this step off with no code change.

**If it returned a 404:** switch to the heading variant in `nodes/Zaple/resources/catalog/index.ts`. One-line diff in the `Get Commerce Settings` option — before:

```ts
				routing: { request: { method: 'GET', url: '/api/v2/commerce/settings' } },
```

After:

```ts
				routing: { request: { method: 'GET', url: '/api/v2/catalogs/commerce-settings' } },
```

Then: re-run Get Commerce Settings in the editor (expected: settings object returned), and verify + commit:

```powershell
npm test
npm run lint
npm run build
git add nodes/Zaple/resources/catalog/index.ts
git commit -m "fix: use /api/v2/catalogs/commerce-settings path"
```

Expected: all three commands exit 0; commit output like `[main <shorthash>] fix: use /api/v2/catalogs/commerce-settings path`.

- [ ] **Step 19: Ambiguity resolution 4 — service message location body shape**

**What to observe:** this ambiguity needs its own live call (Step 8 only tested `text`). In the Step 8 workflow, set the Zaple node to Resource: `Message`, Operation: `Send Service Message`, Country Code / Send To = the test phone (the 24-hour window from Step 8 must still be open — if more than 24 hours have passed, reply from the phone again first), **Type** = `Location`, **Latitude** = `19.0760`, **Longitude** = `72.8777`, **Location Name** = `Test Pin`, **Address** = `Mumbai, India`. Execute. The node currently sends the fields FLAT in the body (`latitude`, `longitude`, `name`, `address`); the docs were ambiguous between that and a nested `location: {…}` object.

**If the call succeeds and a location pin arrives on the phone:** the flat shape is correct. Remove the now-resolved ambiguity note from the Latitude field's description in `nodes/Zaple/resources/message/sendService.ts` (the shipped UI must not reference plan internals) — before:

```ts
			description:
				'Latitude of the location. Note: the Zaple docs are ambiguous about flat vs nested location payloads — the flat body shape used here is verified against the live API in Task 12.',
```

After:

```ts
			description: 'Latitude of the location',
```

Stage it (`git add nodes/Zaple/resources/message/sendService.ts`) — it rides along in the Step 20 commit. Check this step off.

**If the call fails with a validation error naming the location fields (e.g. "location field is required" or latitude/longitude rejected):** the API wants them nested under a `location` object. Apply the contingency:

1. Append the following function to the END of `nodes/Zaple/shared/preSendFunctions.ts` (after `sendJsonField`, or after `encodeAsFormData` if Step 16 added it). It runs AFTER the field-level routing has placed the flat keys into the body, so it re-nests them:

```ts
export async function mapServiceLocation(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const type = this.getNodeParameter('type', 'text') as string;
	if (type !== 'location') return requestOptions;
	const body = (requestOptions.body ?? {}) as IDataObject;
	const location: IDataObject = {
		latitude: body.latitude,
		longitude: body.longitude,
	};
	if (body.name !== undefined) location.name = body.name;
	if (body.address !== undefined) location.address = body.address;
	delete body.latitude;
	delete body.longitude;
	delete body.name;
	delete body.address;
	requestOptions.body = { ...body, location };
	return requestOptions;
}
```

2. Attach it to the Send Service Message operation in `nodes/Zaple/resources/message/index.ts`. Import block — before:

```ts
import {
	mapMediaFields,
	mapQuickReplyPayloads,
	mapTemplateArguments,
} from '../../shared/preSendFunctions';
```

After:

```ts
import {
	mapMediaFields,
	mapQuickReplyPayloads,
	mapServiceLocation,
	mapTemplateArguments,
} from '../../shared/preSendFunctions';
```

`sendService` option's preSend list — before:

```ts
					send: { preSend: [mapMediaFields, mapTemplateArguments] },
```

After:

```ts
					send: { preSend: [mapMediaFields, mapTemplateArguments, mapServiceLocation] },
```

(If Step 16 appended `encodeAsFormData` to this same list, keep it LAST: `[mapMediaFields, mapTemplateArguments, mapServiceLocation, encodeAsFormData]`.)

3. Apply the same Latitude-description cleanup shown in the success branch above (the ambiguity is resolved either way).

4. Re-run the location send in the editor. Expected: success response and a location pin with name "Test Pin" arrives on the phone.

5. Verify the gates and commit:

```powershell
npm test
npm run lint
npm run build
git add nodes/Zaple/shared/preSendFunctions.ts nodes/Zaple/resources/message
git commit -m "fix: nest service message location fields under location object"
```

Expected: all three commands exit 0; commit output like `[main <shorthash>] fix: nest service message location fields under location object`.

- [ ] **Step 20: Wrap up — README corrections and final commit**

Go through the scratch note. For every place where live behavior differed from what `README.md` (Task 10) documents — error strings (e.g. the exact `deletion_not_allowed` wording from Step 11), response shapes, the lead idempotency behavior, any path or body-shape fix applied in Steps 16–19 — update the corresponding README text now so the shipped docs match reality. Then stop the dev server (`Ctrl+C` in the Step 2 terminal) and run the repo-green gates from the project root:

```powershell
npm test
```

Expected: all tests pass; exit code 0.

```powershell
npm run lint
```

Expected: exit code 0.

```powershell
npm run build
```

Expected: exit code 0.

Then commit:

```powershell
git add README.md nodes
git commit --allow-empty -m "test: live API verification complete"
```

Expected output: `[main <shorthash>] test: live API verification complete` (the `--allow-empty` flag makes the milestone commit succeed even in the best case where every live test passed on the first try and no file changed; the staged Latitude-description edit from Step 19's success branch is included here if it was not already committed by a contingency).

### Task 13: GitHub push, npm Trusted Publisher, release v0.1.0, server install

**Files:**
- Modify: `package.json` (fill in `homepage` and `repository.url` with the real GitHub URL — Task 1 deliberately left them `""`)
- Test: none — this task is release procedure; the gates are the CI/publish workflows themselves, `npm view` against the live registry, `npx @n8n/scan-community-package`, and a smoke test on Hardik's production n8n server.

**Interfaces:**
- Consumes (from Task 1): `package.json` with `"version": "0.1.0"` and the `release`/`prepublishOnly` scripts; (from Task 11): `.github/workflows/ci.yml` (lint + build on push) and `.github/workflows/publish.yml` (runs on version-tag push with `id-token: write`, publishing to npm with provenance via Trusted Publisher OIDC, falling back to an `NPM_TOKEN` secret); (from Task 12): a fully live-verified working tree, all committed.
- Consumes (from Hardik, at execution time): his GitHub username — written as `<owner>` in every command/URL below; substitute the real value everywhere. Also: an npmjs.com account login and admin access to his self-hosted n8n instance.
- Produces: public repo `https://github.com/<owner>/n8n-nodes-zaple`; npm package `n8n-nodes-zaple@0.1.0` published with provenance; git tag `v0.1.0`; the package installed and smoke-tested on Hardik's n8n server. Task 14 consumes all of these.

Background for the executor: n8n's verification checklist requires the npm package's `repository` field to point at a matching public GitHub repo, and (since 2026-05-01) requires the package to be published **with npm provenance** — a cryptographic attestation, generated inside GitHub Actions via OIDC (`id-token: write`), proving which repo/workflow built the artifact. Provenance can only be produced in CI, never from a laptop — hence the global constraint: NEVER run `npm publish` locally; publishing happens only by pushing a version tag, which triggers `.github/workflows/publish.yml`. npm's "Trusted Publisher" feature lets the workflow authenticate to npm via OIDC with no long-lived token; it is configured on the npm package's settings page, which only exists after the package's first publish — so the first release may need the `NPM_TOKEN` fallback (Step 4 handles both orders).

- [ ] **Step 1: Preflight — clean tree, green gates, confirm `<owner>`**

Ask Hardik for (or confirm) his GitHub username; substitute it for `<owner>` in every following step. Then from the project root:

```powershell
git status
npm test
npm run lint
npm run build
```

Expected: `git status` reports `nothing to commit, working tree clean` on branch `main` (if Task 12 left uncommitted changes, stop and finish Task 12's commits first); the three npm commands exit 0.

- [ ] **Step 2: Create the public GitHub repository and push**

Check whether the GitHub CLI is available and authenticated as Hardik:

```powershell
gh --version
gh auth status
```

**If `gh` is available and authenticated** (expected: a version line, then `Logged in to github.com account <owner>`):

```powershell
gh repo create n8n-nodes-zaple --public --source=. --push
```

Expected output: `✓ Created repository <owner>/n8n-nodes-zaple on GitHub` followed by a push of `main` (`branch 'main' set up to track 'origin/main'`).

**If `gh` is not available:** create the repo manually — on github.com (logged in as Hardik) → New repository → name `n8n-nodes-zaple`, visibility **Public**, and do NOT initialize with a README/.gitignore/license (the local repo already has them; an initialized remote would force a merge). Then:

```powershell
git remote add origin https://github.com/<owner>/n8n-nodes-zaple.git
git push -u origin main
```

Expected: push succeeds; `https://github.com/<owner>/n8n-nodes-zaple` shows the code, and the **Actions** tab shows the Task 11 CI workflow running on the push — wait for it and confirm it is green (lint + build pass in CI, on a clean Linux runner, exactly as they did locally).

- [ ] **Step 3: Set the repository metadata in `package.json` and commit**

Edit `package.json`. Two exact changes (Task 1 left both values empty on purpose). Before:

```json
	"homepage": "",
```

After:

```json
	"homepage": "https://github.com/<owner>/n8n-nodes-zaple",
```

Before:

```json
	"repository": { "type": "git", "url": "" },
```

After:

```json
	"repository": { "type": "git", "url": "git+https://github.com/<owner>/n8n-nodes-zaple.git" },
```

(with `<owner>` substituted). Then commit and push:

```powershell
git add package.json
git commit -m "chore: set repository metadata"
git push
```

Expected output: `[main <shorthash>] chore: set repository metadata`, then a successful push (CI runs green again). This field is verification-critical: n8n checks that the npm package's repository URL matches the public GitHub repo.

- [ ] **Step 4: Configure npm publishing auth — Trusted Publisher, with NPM_TOKEN fallback**

Log in to npmjs.com as Hardik.

**Preferred path — Trusted Publisher (OIDC, no long-lived secret):** open the package settings for `n8n-nodes-zaple` (npmjs.com → the package page → Settings) and configure a Trusted Publisher: publisher type **GitHub Actions**, organization/user `<owner>`, repository `n8n-nodes-zaple`, workflow filename `publish.yml`, environment left empty. Save.

**If npm will not let you configure this yet** (the package settings page does not exist because `n8n-nodes-zaple` has never been published — npm only exposes Trusted Publisher configuration on existing packages): use the token fallback for the FIRST publish:

1. npmjs.com → avatar → Access Tokens → Generate New Token → **Automation** (an automation token bypasses 2FA in CI). Copy the token once — it is shown only now.
2. Add it as a GitHub Actions secret named `NPM_TOKEN` on the repo — either via CLI:

```powershell
gh secret set NPM_TOKEN
```

(paste the token at the hidden prompt; expected: `✓ Set Actions secret NPM_TOKEN for <owner>/n8n-nodes-zaple`) — or via web UI: repo → Settings → Secrets and variables → Actions → New repository secret → name `NPM_TOKEN`, value = the token.

3. AFTER Step 6 succeeds and `n8n-nodes-zaple@0.1.0` exists on npm, come back, configure the Trusted Publisher as described above, delete the automation token on npmjs.com, and remove the `NPM_TOKEN` secret (`gh secret delete NPM_TOKEN`) — future tags then publish via OIDC only.

Expected outcome of this step: exactly one working auth path exists for `publish.yml` (Trusted Publisher configured, or `NPM_TOKEN` secret set).

- [ ] **Step 5: Tag v0.1.0 and push the tag**

```powershell
git tag v0.1.0
git push origin v0.1.0
```

Expected output: the tag push line ` * [new tag]         v0.1.0 -> v0.1.0`. This tag push is the release trigger — `.github/workflows/publish.yml` starts immediately.

- [ ] **Step 6: Watch the Publish workflow — expect green with provenance**

```powershell
gh run watch
```

(select the running `publish.yml` run if prompted; without `gh`, watch it at `https://github.com/<owner>/n8n-nodes-zaple/actions`). Expected: every job step green; the publish step's log contains npm's provenance notice (a line like `npm notice publishing to https://registry.npmjs.org/ with tag latest and public access` plus `Provenance statement published to transparency log`).

If the run FAILS: read the failing step's log. If it failed BEFORE the npm publish step (auth, build), fix the cause (usually Step 4), then delete and re-push the same tag to re-trigger:

```powershell
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
git tag v0.1.0
git push origin v0.1.0
```

If it failed AFTER npm accepted the publish (0.1.0 already live), do NOT reuse the version: fix, bump `version` to `0.1.1` in `package.json`, update `CHANGELOG.md`, commit, and tag `v0.1.1` instead — npm versions are immutable.

- [ ] **Step 7: Verify the package on the npm registry**

```powershell
npm view n8n-nodes-zaple version
```

Expected output:

```
0.1.0
```

(allow a minute or two for registry propagation after Step 6). Then open `https://www.npmjs.com/package/n8n-nodes-zaple` in a browser and confirm the **provenance** indicator on the page (the "Provenance" panel stating the package was built and signed on GitHub Actions from `<owner>/n8n-nodes-zaple` / `publish.yml`). This attestation is mandatory for n8n verification — if it is missing, the publish went out without OIDC provenance; investigate `publish.yml`'s `id-token: write` permission and republish as 0.1.1.

- [ ] **Step 8: Run n8n's community package scanner against the published package**

```powershell
npx @n8n/scan-community-package n8n-nodes-zaple
```

Expected output: the scanner downloads `n8n-nodes-zaple@0.1.0` from npm, runs its security/structure checks, reports success (a passing/"no issues found" summary), and exits 0. If it reports violations, fix them in source, release 0.1.1 through the same tag pipeline, and re-scan — do NOT proceed to Task 14 with a failing scan.

- [ ] **Step 9: Install the package on Hardik's n8n server**

On Hardik's self-hosted n8n (logged in as the instance owner): **Settings → Community Nodes → Install a community node** → enter npm package name `n8n-nodes-zaple` → tick the "I understand the risks of installing unverified code from a public source" acknowledgment → **Install**.

Expected outcome: after a short install, `n8n-nodes-zaple` v0.1.0 appears in the Community Nodes list, and searching for "Zaple" in a workflow's node panel shows both **Zaple** and **Zaple Trigger**.

If the Community Nodes install option is missing: the instance has community packages disabled — set the environment variable `N8N_COMMUNITY_PACKAGES_ENABLED=true` on the server (it defaults to true; something explicitly set it false) and restart n8n, then retry.

- [ ] **Step 10: Smoke test on the server**

On the server n8n:

1. Create the **Zaple API** credential with the real key/secret. Expected: **"Connection tested successfully"** (same credential test as Task 12 Step 3).
2. Build the minimal send workflow (Manual Trigger → Zaple: Resource `Message`, Operation `Send Template Message`, an approved template ID, Hardik's country code + number) and execute. Expected: a `message_id` in the output and the message on Hardik's phone — the published dist bundle works identically to the dev build.
3. Point Zaple at the permanent webhook: create/activate a workflow with **Zaple Trigger** (Events: Message Status Update), copy its **Production URL** (the server has a public URL, no tunnel needed), paste it into app.zaple.ai → Settings → Webhooks, and re-run the send workflow. Expected: an execution appears for the trigger workflow carrying `entry[0].changes[0].value.statuses[]`. (If Task 12 Step 15 was deferred via its fallback, this is the mandatory make-up check.)

- [ ] **Step 11: Commit the release milestone**

Back on the development machine, record the milestone (no file changes are expected at this point — the flag keeps the commit valid either way):

```powershell
git commit --allow-empty -m "chore: release v0.1.0 published to npm and verified on server"
git push
```

Expected output: `[main <shorthash>] chore: release v0.1.0 published to npm and verified on server`, then a successful push.

### Task 14: n8n verification submission

**Files:**
- None created or modified (a rejection-driven iteration would loop back through earlier tasks' files and a new patch release; the happy path touches nothing).
- Test: the pre-submission checklist below — each item verified by command or by reference to the completed task that satisfied it.

**Interfaces:**
- Consumes: the published, provenance-attested `n8n-nodes-zaple@0.1.0` (Task 13), the public repo `https://github.com/<owner>/n8n-nodes-zaple` (Task 13), the completed live verification (Task 12), `README.md`/`CHANGELOG.md` (Task 10), and Hardik's presence for the creators.n8n.io sign-in.
- Produces: a submitted verification request for `n8n-nodes-zaple` at creators.n8n.io — the project's final deliverable. Success criterion (spec §9): the submission requires no rework.

Background for the executor: n8n "verification" is a manual review by the n8n team that, when granted, makes the package installable/discoverable as a verified community node directly from the n8n editor (including on n8n Cloud). Submission happens on n8n's Creator hub at https://creators.n8n.io/nodes. The review is human and queue-based: there is no hard SLA (expect days to a few weeks), and rejections come back **with concrete reasons** that can be fixed and resubmitted. Every technical requirement was designed-in from Task 1, so this task is: prove each requirement still holds against the LIVE published artifacts (not local files — the reviewer sees what npm serves), then fill in the form.

- [ ] **Step 1: Pre-submission checklist — verify every requirement against the published package**

Run the four registry checks from the project root and confirm each expected output:

```powershell
npm view n8n-nodes-zaple license
```

Expected output: `MIT` — [ ] **MIT license** (LICENSE.md written in Task 1; `"license": "MIT"` in package.json from Task 1).

```powershell
npm view n8n-nodes-zaple dependencies
```

Expected output: EMPTY (no output at all) — [ ] **zero runtime dependencies** (hard rule; `n8n-workflow` is a peer dependency only, per Task 1). Double-check locally that no `dependencies` key sneaked in:

```powershell
node -e "console.log(require('./package.json').dependencies ? 'FAIL' : 'PASS')"
```

Expected output: `PASS`.

```powershell
npm view n8n-nodes-zaple keywords
```

Expected output includes `n8n-community-node-package` — [ ] **required keyword present** (Task 1).

```powershell
npm view n8n-nodes-zaple repository.url
```

Expected output: `git+https://github.com/<owner>/n8n-nodes-zaple.git` — [ ] **npm repository field matches the public GitHub repo** (Task 13 Step 3; the repo is public per Task 13 Step 2).

Then confirm the remaining items:

- [ ] **`n8n-nodes-` package name**: the package is `n8n-nodes-zaple` (Task 1) — matches the mandatory prefix by construction.
- [ ] **One service per package**: both nodes (`Zaple`, `Zaple Trigger`) target only Zaple.ai — a trigger for the same service is explicitly allowed (spec §8).
- [ ] **English-only UI**: all displayNames, descriptions, actions, notices, and README text were written in English (Tasks 2, 4–10); spot-check the node UI rendered in Task 13 Step 10.
- [ ] **No environment-variable or filesystem access in node/credential code**: run

```powershell
Get-ChildItem -Recurse nodes,credentials -Filter *.ts | Select-String -Pattern "process\.env|from 'fs'|require\('fs'\)"
```

Expected output: EMPTY (no matching lines).

- [ ] **README complete**: `README.md` (Task 10) covers installation, both credential setups (where to find the keys in the Zaple dashboard), all resources/operations, the trigger's manual webhook setup, and at least one example workflow — re-read it once now as a reviewer would, including the Task 12 Step 20 corrections.
- [ ] **Published with provenance via GitHub Actions**: the Provenance panel is visible on https://www.npmjs.com/package/n8n-nodes-zaple (verified in Task 13 Step 7; mandatory since 2026-05-01).
- [ ] **Scanner passes**: `npx @n8n/scan-community-package n8n-nodes-zaple` exited 0 (Task 13 Step 8).

If ANY item fails, stop — fix it, release a patch version through the Task 13 tag pipeline (bump `version`, update `CHANGELOG.md`, commit, tag `v0.1.x`, verify), and re-run this checklist before submitting.

- [ ] **Step 2: Submit the package at creators.n8n.io**

With Hardik at the keyboard (the Creator hub account should be his): open **https://creators.n8n.io/nodes** in a browser and sign in (create the creator account if he does not have one — GitHub sign-in is the natural choice since it proves ownership of the repo). Find the node-submission entry point (a "Submit" / "Submit your node" action on the nodes page) and fill in the form:

- npm package name: `n8n-nodes-zaple`
- GitHub repository: `https://github.com/<owner>/n8n-nodes-zaple`
- Contact email: `hardik.chavda@pect.in`
- Description (if asked): `n8n community node for the Zaple.ai WhatsApp Business API — template & service messages, batch campaigns, templates, leads, catalogs, and a webhook trigger.`
- Any checklist confirmations the form asks for (license, no runtime deps, provenance, …): all were verified in Step 1 — answer truthfully.

Submit. Expected outcome: an on-screen confirmation that the submission was received (and/or a confirmation email to the contact address). Record the submission date and any reference ID in `CHANGELOG.md`-adjacent notes or the scratch note.

- [ ] **Step 3: Record what happens next (review expectations)**

Nothing to execute — set expectations with Hardik so the follow-up is handled:

- The review is manual and queue-based; expect **days to a few weeks** with no hard SLA. There is no need to (and no way to) expedite; the package remains fully installable as an unverified community node meanwhile (it already runs on Hardik's server per Task 13).
- If **rejected**: the response includes concrete reasons. The iteration loop is: fix the flagged issues in source → bump the patch version in `package.json` + update `CHANGELOG.md` → commit → tag `v0.1.x` and push the tag (the Task 13 pipeline publishes with provenance automatically) → re-run the Task 14 Step 1 checklist → resubmit/reply per the rejection instructions.
- If **approved**: the node appears as a verified community node in the n8n editor. Consider announcing it in the Zaple docs/dashboard.

- [ ] **Step 4: Final commit — mark the submission**

```powershell
git commit --allow-empty -m "chore: submit n8n-nodes-zaple for n8n verification"
git push
```

Expected output: `[main <shorthash>] chore: submit n8n-nodes-zaple for n8n verification`, then a successful push. The plan is complete: all 28 operations plus the trigger are live-verified (Task 12), `n8n-nodes-zaple@0.1.0` is on npm with provenance and installed on Hardik's server (Task 13), and the verification request is submitted (Task 14) — matching the spec §9 success criteria.


