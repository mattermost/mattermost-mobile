// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';

import {settleAuditEvents} from '@actions/local/ephemeral_mode/audit_queue';
import {EphemeralModeAuditEventKind, MAX_AUDIT_SEND_ATTEMPTS, type EphemeralModeAuditEvent} from '@constants/ephemeral_mode';
import {getPreauthSecret} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getEphemeralModeAuditEvents} from '@queries/app/global';
import {getAllServers} from '@queries/app/servers';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {logDebug, logError, logWarning} from '@utils/log';

import type {Client} from '@client/rest';

// Retry only what can plausibly succeed later; 501 (unlicensed/pre-11.10 server) never will.
const RETRYABLE_AUDIT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const flushInFlight = new Set<string>();

const isSessionWipe = (event: EphemeralModeAuditEvent) => event.kind === EphemeralModeAuditEventKind.SessionWipe;

const sendAuditEvent = (client: Client, event: EphemeralModeAuditEvent) => {
    switch (event.kind) {
        case EphemeralModeAuditEventKind.OfflinePurge:
            return client.logOfflinePurge(event.offlineTimeMinutes, event.occurredAt, event.errorReason);
        case EphemeralModeAuditEventKind.Cleanup:
            return client.logCleanup(event.postsDeleted, event.playbookRunsDeleted, event.occurredAt, event.errorReason);
        case EphemeralModeAuditEventKind.SessionWipe:
            return client.logSessionWipe(event.userId, event.occurredAt, event.errorReason);
        default:
            return undefined;
    }
};

export const flushAuditQueue = async (serverUrl: string): Promise<void> => {
    if (flushInFlight.has(serverUrl)) {
        logDebug('flushAuditQueue: already running for', serverUrl);
        return;
    }
    flushInFlight.add(serverUrl);

    let tokenless = false;
    try {
        // No connectivity is our failure, not the server's: attempt nothing, so no event is charged an attempt.
        if (!(await NetInfo.fetch()).isConnected) {
            logDebug('flushAuditQueue: offline, keeping queue for', serverUrl);
            return;
        }

        const pending = await getEphemeralModeAuditEvents(serverUrl);
        if (!pending.length) {
            logDebug('flushAuditQueue: nothing queued for', serverUrl);
            return;
        }

        let client: Client | undefined;
        try {
            client = NetworkManager.getClient(serverUrl);
        } catch {
            // Logged out: /wipe is the only kind still sendable, and only tokenless.
            if (pending.some(isSessionWipe)) {
                client = await NetworkManager.createClient(serverUrl, undefined, await getPreauthSecret(serverUrl));
                tokenless = true;
            }
        }

        if (!client) {
            logDebug('flushAuditQueue: no usable client, keeping queue for', serverUrl);
            return;
        }

        const consumed = new Set<string>();
        const failed = new Set<string>();

        for (const event of pending) {
            if (tokenless && !isSessionWipe(event)) {
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                await sendAuditEvent(client, event);
                consumed.add(event.id);
            } catch (error) {
                // A definite answer we cannot retry — the request itself is rejected.
                if (isErrorWithStatusCode(error) && !RETRYABLE_AUDIT_STATUS_CODES.has(error.status_code)) {
                    logDebug('flushAuditQueue: server rejected event, dropping', serverUrl, event.kind, error.status_code);
                    consumed.add(event.id);
                    continue;
                }
                logError('flushAuditQueue', serverUrl, event.kind, getFullErrorMessage(error));
                if (event.attempts + 1 >= MAX_AUDIT_SEND_ATTEMPTS) {
                    logWarning('flushAuditQueue: giving up on event after repeated failures', serverUrl, event.kind);
                    consumed.add(event.id);
                    continue;
                }
                failed.add(event.id);
            }
        }

        if (consumed.size || failed.size) {
            // Match on id: the queue may have been appended to or pruned mid-flight.
            await settleAuditEvents(serverUrl, consumed, failed);
        }
    } catch (error) {
        logError('flushAuditQueue', serverUrl, getFullErrorMessage(error));
    } finally {
        if (tokenless) {
            NetworkManager.invalidateClient(serverUrl);
        }
        flushInFlight.delete(serverUrl);
    }
};

// Servers the app can no longer log into, so doReconnect will never flush them.
export const flushOrphanedAuditQueues = async (serverCredentials: ServerCredential[]) => {
    const credentialed = new Set(serverCredentials.map(({serverUrl}) => serverUrl));
    const servers = await getAllServers();
    for (const server of servers.filter(({url}) => !credentialed.has(url))) {
        flushAuditQueue(server.url);
    }
};
