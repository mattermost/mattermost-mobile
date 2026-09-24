// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {
    RedactionInvalidationReason,
    getRedactionEpochState,
    invalidateChannelsRedaction,
    invalidateRedactionGlobally,
    isRedactionEnforced,
    type RedactionReason,
} from '@actions/local/redaction';
import {fetchPostThread, refetchPostsForRedaction} from '@actions/remote/post';
import {Events, WebsocketEvents} from '@constants';
import {CHANNEL_ATTRIBUTE_OBJECT_TYPE, USER_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import {SESSION_ATTRIBUTES_OBJECT_TYPE} from '@constants/session_attributes';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getAccessControlGroupId} from '@queries/servers/properties';
import {getCurrentChannelId, getCurrentUserId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError, logWarning} from '@utils/log';

import type {Database} from '@nozbe/watermelondb';

// One CPA write emits both custom_profile_attributes_values_updated and property_values_updated;
// batching by scope collapses them into a single epoch advance and refresh.
const COALESCE_WINDOW_MS = 250;

// The server's attribute view refreshes on a hardcoded 30s interval and its staleness marker is
// node-local, so in HA the refetch can still evaluate stale attributes. One late retry converges
// without polling.
const ATTRIBUTE_VIEW_RETRY_MS = 32000;
const ATTRIBUTE_VIEW_RETRY_JITTER_MS = 3000;

// A lost epoch write leaves every cached decision trusted, so it is retried rather than dropped.
const MAX_INVALIDATION_ATTEMPTS = 3;
const INVALIDATION_RETRY_MS = 2000;

type PendingInvalidation = {
    timeout: ReturnType<typeof setTimeout>;
    reason: RedactionReason;

    // Undefined for a global invalidation.
    channelIds?: Set<string>;
    needsAttributeViewRetry: boolean;
};

// Keyed by server and scope, so two servers never coalesce into each other and a channel policy edit
// never absorbs a global one. All channel-scoped events of a server share one batch: a parent policy
// save sends one event per child channel, and each would otherwise be its own write and refetch.
const pendingInvalidations = new Map<string, PendingInvalidation>();
const attributeViewRetries = new Map<string, ReturnType<typeof setTimeout>>();

// A trigger awaits the feature predicate before registering anything, so a logout landing in that
// window would leave a timer clearRedactionInvalidations never saw. The token lets the in-flight
// trigger notice the teardown and abandon itself.
const cleanupTokens = new Map<string, number>();
const cleanupToken = (serverUrl: string) => cleanupTokens.get(serverUrl) ?? 0;

const scopeKey = (serverUrl: string, channelId?: string) => `${serverUrl}|${channelId ? 'channels' : 'global'}`;

/**
 * The gallery and PDF viewer hold their items by value, so no database change can reach them; they
 * are closed instead. Only when the change can affect what they show: the active server, and for a
 * channel-scoped change, the channel of the post being viewed. An unknown post is closed.
 */
const closeFileViewersIfAffected = async (serverUrl: string, channelIds?: Set<string>) => {
    try {
        if ((await DatabaseManager.getActiveServerUrl()) !== serverUrl) {
            return;
        }

        if (channelIds) {
            const viewedPostId = EphemeralStore.getCurrentFileViewerPostId();
            if (viewedPostId) {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const viewedPost = await getPostById(database, viewedPostId);
                if (viewedPost && !channelIds.has(viewedPost.channelId)) {
                    return;
                }
            }
        }

        DeviceEventEmitter.emit(Events.CLOSE_GALLERY);
    } catch (error) {
        logError('closeFileViewersIfAffected', getFullErrorMessage(error));
    }
};

const refreshVisibleSurfaces = async (serverUrl: string, channelIds?: Set<string>) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Only the active server can have posts on screen; the rest converge when next rendered,
        // because the epoch they need is already persisted.
        if ((await DatabaseManager.getActiveServerUrl()) !== serverUrl) {
            return;
        }

        const currentChannelId = await getCurrentChannelId(database);
        if (currentChannelId && (!channelIds || channelIds.has(currentChannelId))) {
            const {error} = await refetchPostsForRedaction(serverUrl, currentChannelId);
            if (error) {
                logError('refreshVisibleSurfaces: failed to re-fetch channel posts', currentChannelId, getFullErrorMessage(error));
            }
        }

        // No fromCreateAt: an incremental thread fetch cannot re-deliver replies whose only change
        // was their redaction state. A thread lives in one channel, so a scoped change elsewhere
        // leaves it alone.
        const threadId = EphemeralStore.getCurrentThreadId();
        const threadRoot = threadId && channelIds ? await getPostById(database, threadId) : undefined;
        if (threadId && (!channelIds || !threadRoot || channelIds.has(threadRoot.channelId))) {
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
            await closeFileViewersIfAffected(serverUrl);
            await refreshVisibleSurfaces(serverUrl);
        } catch (error) {
            logError('scheduleAttributeViewRetry', getFullErrorMessage(error));
        }
    }, delay);

    attributeViewRetries.set(serverUrl, timeout);
};

const flushInvalidation = async (serverUrl: string, pending: PendingInvalidation, token = cleanupToken(serverUrl), attempt = 1) => {
    const {channelIds} = pending;
    const epoch = channelIds ? await invalidateChannelsRedaction(serverUrl, Array.from(channelIds), pending.reason) : await invalidateRedactionGlobally(serverUrl, pending.reason);

    // Torn down while writing: nothing below may run against a new session.
    if (cleanupToken(serverUrl) !== token) {
        return;
    }

    if (epoch === undefined) {
        if (attempt < MAX_INVALIDATION_ATTEMPTS) {
            logWarning('flushInvalidation: could not raise the epoch, retrying', pending.reason, String(attempt));
            setTimeout(() => {
                if (cleanupToken(serverUrl) === token) {
                    flushInvalidation(serverUrl, pending, token, attempt + 1);
                }
            }, INVALIDATION_RETRY_MS * attempt);
        } else {
            logError('flushInvalidation: gave up raising the epoch', pending.reason, channelIds ? `${channelIds.size} channels` : 'global');
        }
        return;
    }

    logDebug('flushInvalidation: redaction invalidated', pending.reason, channelIds ? `${channelIds.size} channels` : 'global', String(epoch));

    await closeFileViewersIfAffected(serverUrl, channelIds);
    await refreshVisibleSurfaces(serverUrl, channelIds);

    if (pending.needsAttributeViewRetry && cleanupToken(serverUrl) === token) {
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
            if (channelId) {
                existing.channelIds?.add(channelId);
            }
            return;
        }

        const pending: PendingInvalidation = {
            reason,
            channelIds: channelId ? new Set([channelId]) : undefined,
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
 * Managed channel categories store per-channel values in the same property tables, so a channel
 * values event only matters when the access control group wrote it. Each written value names its
 * group; a clear of every value on the channel names none, and neither does the group while it is
 * still unknown locally, and both are treated as affecting access rather than risk missing one.
 */
const isAccessControlValuesChange = async (database: Database, rawValues?: string) => {
    const values = rawValues ? safeParseJSON(rawValues) as PropertyValue[] | undefined : undefined;
    const groupId = await getAccessControlGroupId(database);
    if (!Array.isArray(values) || !values.length || !groupId) {
        return true;
    }
    return values.some((value) => value.group_id === groupId);
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

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Channel attribute values are the resource side of every policy on that channel.
        if (msg.data?.object_type === CHANNEL_ATTRIBUTE_OBJECT_TYPE) {
            const channelId = msg.data?.target_id;
            if (channelId && await isAccessControlValuesChange(database, msg.data?.values)) {
                scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.ChannelAttributes, channelId);
            }
            return;
        }

        if (msg.data?.object_type !== USER_ATTRIBUTE_OBJECT_TYPE) {
            return;
        }

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
 * User attribute fields: renaming or re-ranking an option, or changing a field's type, rewrites the
 * values every policy is evaluated against without touching a single value row, so no values event
 * follows. Creating one is skipped: no subject has a value for it yet.
 *
 * Session attribute fields: the manifest decides which attributes this client sends on every request,
 * so adding, changing or removing a field changes the session subject from the next request on.
 * The coalescing window lets the manifest update reach the native client before the refetch.
 */
export const handleRedactionForPropertyFieldChanged = async (serverUrl: string, msg: WebSocketMessage) => {
    const field = safeParseJSON(msg.data?.property_field) as PropertyField | undefined;
    const objectType = msg.data?.object_type ?? field?.object_type;

    if (objectType === SESSION_ATTRIBUTES_OBJECT_TYPE) {
        scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.SessionAttributes);
        return;
    }

    // An edited channel attribute field rewrites the resource side of policies on every channel that
    // holds a value for it; which ones is not in the payload. Deleting one clears its values, which
    // arrives as its own values event.
    if (objectType === CHANNEL_ATTRIBUTE_OBJECT_TYPE) {
        if (msg.event !== WebsocketEvents.PROPERTY_FIELD_UPDATED || !field?.group_id) {
            return;
        }
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            if (field.group_id === await getAccessControlGroupId(database)) {
                scheduleRedactionInvalidation(serverUrl, RedactionInvalidationReason.ChannelAttributes);
            }
        } catch (error) {
            logError('handleRedactionForPropertyFieldChanged', getFullErrorMessage(error));
        }
        return;
    }

    if (objectType !== USER_ATTRIBUTE_OBJECT_TYPE || msg.event === WebsocketEvents.PROPERTY_FIELD_CREATED) {
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
 *
 * Raised even while ABAC is not enforced: it may have been turned off while events were lost, and a
 * denial cached before that is only re-checked once it is behind the epoch. It costs one write; with
 * enforcement off nothing without a cached denial is gated.
 */
export const invalidateRedactionOnResync = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.Resync);

        // A viewer left open across a long background can hold attachments the missed events revoked.
        if (await isRedactionEnforced(database)) {
            await closeFileViewersIfAffected(serverUrl);
        }
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
