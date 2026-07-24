// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const DRAFT_TYPE_DRAFT = 'draft' as const;
export const DRAFT_TYPE_SCHEDULED = 'scheduled' as const;

export type DraftType = typeof DRAFT_TYPE_DRAFT | typeof DRAFT_TYPE_SCHEDULED;

export const DRAFT_SCHEDULED_POST_LAYOUT_PADDING = 40;

export const DRAFT_SCREEN_TAB_DRAFTS = 'drafts' as const;
export const DRAFT_SCREEN_TAB_SCHEDULED_POSTS = 'scheduled_posts' as const;
export type DraftScreenTab = typeof DRAFT_SCREEN_TAB_DRAFTS | typeof DRAFT_SCREEN_TAB_SCHEDULED_POSTS;

// DraftOutbox durable operation queued for a draft key.
export const DraftOutboxOperation = {
    Upsert: 'upsert',
    Delete: 'delete',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DraftOutboxOperation = typeof DraftOutboxOperation[keyof typeof DraftOutboxOperation];

// DraftOutbox status for the currently queued operation of a draft key.
export const DraftOutboxStatus = {
    Pending: 'pending',
    WaitingForUpload: 'waiting_for_upload',
    BlockedUpload: 'blocked_upload',
    ConfirmingDelete: 'confirming_delete',
    Blocked: 'blocked',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DraftOutboxStatus = typeof DraftOutboxStatus[keyof typeof DraftOutboxStatus];
