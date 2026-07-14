// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
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
