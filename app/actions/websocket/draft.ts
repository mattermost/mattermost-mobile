// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DraftSyncManager from '@managers/draft_sync_manager';

/**
 * handleDraftWebSocketEvent: route an inbound draft_created / draft_deleted event to the draft-sync
 * coordinator. Phase 5 treats the event as a CHANGE SIGNAL that triggers an authoritative reconcile
 * of the current team, rather than applying the event payload directly (an empty-message upsert
 * deletes a draft with no event, so a GET reconciliation is required regardless). The manager ignores
 * the event when draft sync is disabled/invalidated. The server scopes these events to the owning
 * user's other sessions, so no per-user filtering is needed here.
 */
export function handleDraftWebSocketEvent(serverUrl: string, msg: WebSocketMessage): void {
    DraftSyncManager.enqueueWebSocketEvent(serverUrl, msg);
}
