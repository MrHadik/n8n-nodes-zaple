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
