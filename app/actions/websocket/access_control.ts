// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {
    RedactionInvalidationReason,
    getRedactionEpochState,
    invalidateChannelRedaction,
    invalidateRedactionGlobally,
    isRedactionEnforced,
    type RedactionReason,
} from '@actions/local/redaction';
import {fetchPostThread, refetchPostsForRedaction} from '@actions/remote/post';
import {Events, WebsocketEvents} from '@constants';
import {USER_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import DatabaseManager from '@database/manager';
import {getCurrentChannelId, getCurrentUserId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

// One CPA write emits both custom_profile_attributes_values_updated and property_values_updated;
// batching by scope collapses them into a single epoch advance and refresh.
const COALESCE_WINDOW_MS = 250;

// The server's attribute view refreshes on a hardcoded 30s interval and its staleness marker is
// node-local, so in HA the refetch can still evaluate stale attributes. One late retry converges
// without polling.
const ATTRIBUTE_VIEW_RETRY_MS = 32000;
const ATTRIBUTE_VIEW_RETRY_JITTER_MS = 3000;

type PendingInvalidation = {
    timeout: ReturnType<typeof setTimeout>;
    reason: RedactionReason;
    channelId?: string;
    needsAttributeViewRetry: boolean;
};

// Keyed by scope so two servers never coalesce into each other, and a channel policy edit never
// absorbs a global one.
const pendingInvalidations = new Map<string, PendingInvalidation>();
const attributeViewRetries = new Map<string, ReturnType<typeof setTimeout>>();

// A trigger awaits the feature predicate before registering anything, so a logout landing in that
// window would leave a timer clearRedactionInvalidations never saw. The token lets the in-flight
// trigger notice the teardown and abandon itself.
const cleanupTokens = new Map<string, number>();
const cleanupToken = (serverUrl: string) => cleanupTokens.get(serverUrl) ?? 0;

const scopeKey = (serverUrl: string, channelId?: string) => `${serverUrl}|${channelId ?? 'global'}`;

const refreshVisibleSurfaces = async (serverUrl: string, channelId?: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Only the active server can have posts on screen; the rest converge when next rendered,
        // because the epoch they need is already persisted.
        if ((await DatabaseManager.getActiveServerUrl()) !== serverUrl) {
            return;
        }

        const currentChannelId = await getCurrentChannelId(database);
        if (currentChannelId && (!channelId || channelId === currentChannelId)) {
            const {error} = await refetchPostsForRedaction(serverUrl, currentChannelId);
            if (error) {
                logError('refreshVisibleSurfaces: failed to re-fetch channel posts', currentChannelId, getFullErrorMessage(error));
            }
        }

        // No fromCreateAt: an incremental thread fetch cannot re-deliver replies whose only change
        // was their redaction state.
        const threadId = EphemeralStore.getCurrentThreadId();
        if (threadId) {
            const {error} = await fetchPostThread(serverUrl, threadId);
            if (error) {
                logError('refreshVisibleSurfaces: failed to re-fetch thread posts', getFullErrorMessage(error));
            }
        }
    } catch (error) {
        logError('refreshVisibleSurfaces', getFullErrorMessage(error));
    }
};

const scheduleAttributeViewRetry = (serverUrl: string, epoch: number) => {
    const existing = attributeViewRetries.get(serverUrl);
    if (existing) {
        clearTimeout(existing);
    }

    const delay = ATTRIBUTE_VIEW_RETRY_MS + Math.floor(Math.random() * ATTRIBUTE_VIEW_RETRY_JITTER_MS);
    const timeout = setTimeout(async () => {
        attributeViewRetries.delete(serverUrl);
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            if (!(await isRedactionEnforced(database))) {
                return;
            }

            // A newer invalidation already forced a fresh evaluation.
            if ((await getRedactionEpochState(database)).counter > epoch) {
                logDebug('scheduleAttributeViewRetry: superseded, skipping');
                return;
            }

            const next = await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.AttributeViewRetry);
            logDebug('scheduleAttributeViewRetry: re-evaluated after the server attribute view refresh window', String(next));
            await refreshVisibleSurfaces(serverUrl);
        } catch (error) {
            logError('scheduleAttributeViewRetry', getFullErrorMessage(error));
        }
    }, delay);

    attributeViewRetries.set(serverUrl, timeout);
};

const flushInvalidation = async (serverUrl: string, pending: PendingInvalidation) => {
    const epoch = pending.channelId ? await invalidateChannelRedaction(serverUrl, pending.channelId, pending.reason) : await invalidateRedactionGlobally(serverUrl, pending.reason);

    if (epoch === undefined) {
        return;
    }

    logDebug('redaction invalidated', pending.reason, pending.channelId ?? 'global', String(epoch));

    // The gallery holds its items by value, so no database change can reach an open viewer.
    DeviceEventEmitter.emit(Events.CLOSE_GALLERY);

    await refreshVisibleSurfaces(serverUrl, pending.channelId);

    if (pending.needsAttributeViewRetry) {
        scheduleAttributeViewRetry(serverUrl, epoch);
    }
};

/**
 * The first event in a window sets the deadline and later ones are absorbed; the key is released on
 * flush so a late arrival starts a new batch instead of being swallowed. The deadline is never
 * extended — a stream of attribute writes would otherwise postpone the invalidation indefinitely.
 */
export const scheduleRedactionInvalidation = async (
    serverUrl: string,
    reason: RedactionReason,
    channelId?: string,
    needsAttributeViewRetry = false,
) => {
    const token = cleanupToken(serverUrl);
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await isRedactionEnforced(database))) {
            return;
        }

        if (cleanupToken(serverUrl) !== token) {
            logDebug('scheduleRedactionInvalidation: server torn down while scheduling', reason);
            return;
        }

        const key = scopeKey(serverUrl, channelId);
        const existing = pendingInvalidations.get(key);
        if (existing) {
            existing.needsAttributeViewRetry = existing.needsAttributeViewRetry || needsAttributeViewRetry;
            return;
        }

        const pending: PendingInvalidation = {
            reason,
            channelId,
            needsAttributeViewRetry,
            timeout: setTimeout(() => {
                const batch = pendingInvalidations.get(key);
                pendingInvalidations.delete(key);
                if (batch) {
                    flushInvalidation(serverUrl, batch);
                }
            }, COALESCE_WINDOW_MS),
        };

        pendingInvalidations.set(key, pending);
    } catch (error) {
        logError('scheduleRedactionInvalidation', reason, getFullErrorMessage(error));
    }
};

// The payload carries nothing, so every cached channel has to be treated as affected.
export const handlePermissionPolicyUpdatedEvent = (serverUrl: string) => {
    scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.GlobalPolicy);
};

// Scoped to the one channel, so a single policy edit does not invalidate every cached channel.
export const handleChannelAccessControlUpdatedEvent = (serverUrl: string, msg: WebSocketMessage) => {
    const channelId = msg.broadcast?.channel_id || (safeParseJSON(msg.data?.channel) as Channel | undefined)?.id;
    if (!channelId) {
        logDebug('handleChannelAccessControlUpdatedEvent: event carried no channel id');
        return;
    }

    scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.ChannelPolicy, channelId);
};

/**
 * Fires alongside the CPA event for an API write, and alone for plugin writers that bypass that API,
 * so both are handled and the coalescer collapses the duplicate. It omits the originating
 * connection, so it cannot simply replace the CPA event either.
 */
export const handleRedactionForPropertyValuesUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    try {
        // Clearing every value of a field (a field delete, or a type change dropping values) names
        // only the field, so the object type is unknown. It is a rare admin action; treat it as
        // touching every subject rather than miss one that it did.
        if (!msg.data?.object_type && msg.data?.field_id) {
            scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.UserAttributes, undefined, true);
            return;
        }

        if (msg.data?.object_type !== USER_ATTRIBUTE_OBJECT_TYPE) {
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUserId = await getCurrentUserId(database);
        if (!currentUserId || msg.data?.target_id !== currentUserId) {
            return;
        }

        scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.UserAttributes, undefined, true);
    } catch (error) {
        logError('handleRedactionForPropertyValuesUpdated', getFullErrorMessage(error));
    }
};

/**
 * Renaming or re-ranking an option, or changing a field's type, rewrites the attribute values every
 * policy is evaluated against without touching a single value row, so no values event follows.
 * Creating a field is skipped: no subject has a value for it yet.
 */
export const handleRedactionForPropertyFieldChanged = (serverUrl: string, msg: WebSocketMessage) => {
    if (msg.event === WebsocketEvents.PROPERTY_FIELD_CREATED) {
        return;
    }

    const field = safeParseJSON(msg.data?.property_field) as PropertyField | undefined;
    const objectType = msg.data?.object_type ?? field?.object_type;
    if (objectType !== USER_ATTRIBUTE_OBJECT_TYPE) {
        return;
    }

    scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.UserAttributes, undefined, true);
};

// The ABAC subject is global to the user, so every channel is affected.
export const invalidateRedactionForCurrentUser = (serverUrl: string, reason: RedactionReason, needsAttributeViewRetry = false) => {
    scheduleRedactionInvalidation(serverUrl, reason, undefined, needsAttributeViewRetry);
};

// The ABAC subject carries a channel-scoped role, so this affects one channel only.
export const invalidateRedactionForChannelMembership = (serverUrl: string, channelId: string) => {
    scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.ChannelRoles, channelId);
};

/**
 * A resync runs whenever websocket events may have been lost: a cold start, or a reconnect the server
 * could not resume (long timeout, restart, sequence gap). Post rows outlive both, so every cached
 * decision must be assumed stale. Awaited and uncoalesced unlike every other trigger: the fetch that
 * follows has to capture the raised epoch, not the old one.
 */
export const invalidateRedactionOnResync = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await isRedactionEnforced(database))) {
            return;
        }
        await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.Resync);
    } catch (error) {
        logError('invalidateRedactionOnResync', getFullErrorMessage(error));
    }
};

export const clearRedactionInvalidations = (serverUrl: string) => {
    cleanupTokens.set(serverUrl, cleanupToken(serverUrl) + 1);

    for (const [key, pending] of pendingInvalidations.entries()) {
        if (key.startsWith(`${serverUrl}|`)) {
            clearTimeout(pending.timeout);
            pendingInvalidations.delete(key);
        }
    }

    const retry = attributeViewRetries.get(serverUrl);
    if (retry) {
        clearTimeout(retry);
        attributeViewRetries.delete(serverUrl);
    }
};
