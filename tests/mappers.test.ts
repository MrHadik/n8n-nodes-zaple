// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
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
