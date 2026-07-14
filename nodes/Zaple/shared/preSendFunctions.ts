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
