// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {replaceEphemeralModeAuditEvents} from '@actions/app/global';
import {EphemeralModeAuditEventKind, type EphemeralModeAuditEvent, type EphemeralModeAuditEventInput} from '@constants/ephemeral_mode';
import {getEphemeralModeAuditEvents} from '@queries/app/global';
import {generateId} from '@utils/general';
import {logDebug} from '@utils/log';

let auditQueueChain: Promise<unknown> = Promise.resolve();

// Serializes read-modify-write on the Global row; `update` is synchronous so nothing holds the queue across a request.
const updateAuditQueue = (serverUrl: string, update: (events: EphemeralModeAuditEvent[]) => EphemeralModeAuditEvent[]) => {
    const next = auditQueueChain.then(async () => {
        const existing = await getEphemeralModeAuditEvents(serverUrl);
        return replaceEphemeralModeAuditEvents(serverUrl, update(existing));
    });
    auditQueueChain = next.catch(() => undefined);
    return next;
};

export const enqueueAuditEvent = (serverUrl: string, event: EphemeralModeAuditEventInput): Promise<string> => {
    const id = generateId();
    return updateAuditQueue(serverUrl, (events) => [...events, {...event, id, attempts: 0} as EphemeralModeAuditEvent]).
        then(() => id);
};

// A no-op if the event was already sent and removed from the queue by a concurrent flush.
export const attachAuditEventErrorReason = (serverUrl: string, id: string, errorReason: string) => {
    return updateAuditQueue(serverUrl, (events) => events.map((event) => (event.id === id ? {...event, errorReason} : event)));
};

// Drops what the flush finished with, and charges an attempt to whatever failed.
export const settleAuditEvents = (serverUrl: string, consumed: Set<string>, failed: Set<string>) => {
    return updateAuditQueue(serverUrl, (events) => events.
        filter(({id}) => !consumed.has(id)).
        map((event) => (failed.has(event.id) ? {...event, attempts: event.attempts + 1} : event)));
};

// /purge and /cleanup are attributed to the sending session, so keep only /wipe (uses signature as a proof of ownership); drop everything if the server itself is removed.
export const pruneAuditQueueOnSessionEnd = (serverUrl: string, serverRemoved: boolean) => {
    return updateAuditQueue(serverUrl, (events) => {
        const keep = serverRemoved ? [] : events.filter(({kind}) => kind === EphemeralModeAuditEventKind.SessionWipe);
        if (keep.length !== events.length) {
            logDebug('pruneAuditQueueOnSessionEnd', serverUrl, events.length - keep.length);
        }
        return keep;
    });
};
