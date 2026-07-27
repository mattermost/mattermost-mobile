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

// Draft sync retry-timer timing (used by DraftSyncManager).
// DRAFT_SYNC_RETRY_BASE_MS: base delay for the first backoff step.
export const DRAFT_SYNC_RETRY_BASE_MS = 1_000;

// DRAFT_SYNC_RETRY_MAX_MS: ceiling for the exponential backoff delay.
export const DRAFT_SYNC_RETRY_MAX_MS = 300_000;

// DRAFT_SYNC_RETRY_JITTER: fractional (+/-) jitter applied to each backoff delay.
export const DRAFT_SYNC_RETRY_JITTER = 0.2;

// DRAFT_ABSENCE_CONFIRMATION_DELAY_MS: grace period before confirming a draft is absent on the server.
export const DRAFT_ABSENCE_CONFIRMATION_DELAY_MS = 5_000;

// DRAFT_SYNC_RECONCILIATION_DEADLINE_MS: deadline for a baseline reconciliation pass to complete.
export const DRAFT_SYNC_RECONCILIATION_DEADLINE_MS = 30_000;

// DRAFT_SYNC_SNAPSHOT_STALE_MS: age after which a cached reconciliation snapshot is considered stale.
export const DRAFT_SYNC_SNAPSHOT_STALE_MS = 300_000;

// MAX_DRAFT_SYNC_EVENT_BUFFER: hard cap on buffered inbound WebSocket events per server.
export const MAX_DRAFT_SYNC_EVENT_BUFFER = 1_000;
