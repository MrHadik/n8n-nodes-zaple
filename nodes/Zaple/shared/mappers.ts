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
