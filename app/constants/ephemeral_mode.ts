// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const EphemeralModeAuditEventKind = {
    OfflinePurge: 'offlinePurge',
    Cleanup: 'cleanup',
    SessionWipe: 'sessionWipe',
} as const;

// Consecutive failures against a reachable network before an event is given up on.
export const MAX_AUDIT_SEND_ATTEMPTS = 20;

type EphemeralModeAuditEventBase = {
    id: string;
    occurredAt: number;

    // Only incremented when a send actually reached the network.
    attempts: number;

    // Set once the operation's outcome is known, which can be after enqueue. Omitted means it succeeded.
    errorReason?: string;
};

export type EphemeralModeOfflinePurgeAuditEvent = EphemeralModeAuditEventBase & {
    kind: typeof EphemeralModeAuditEventKind.OfflinePurge;
    offlineTimeMinutes: number;
};

export type EphemeralModeCleanupAuditEvent = EphemeralModeAuditEventBase & {
    kind: typeof EphemeralModeAuditEventKind.Cleanup;
    postsDeleted: number;
    playbookRunsDeleted: number;
};

export type EphemeralModeSessionWipeAuditEvent = EphemeralModeAuditEventBase & {
    kind: typeof EphemeralModeAuditEventKind.SessionWipe;
    signature: string;
};

export type EphemeralModeAuditEvent =
    | EphemeralModeOfflinePurgeAuditEvent
    | EphemeralModeCleanupAuditEvent
    | EphemeralModeSessionWipeAuditEvent;

// Distributed over the union so each variant keeps its own fields — a plain Omit would collapse to the common ones.
export type EphemeralModeAuditEventInput =
    | Omit<EphemeralModeOfflinePurgeAuditEvent, 'id' | 'attempts'>
    | Omit<EphemeralModeCleanupAuditEvent, 'id' | 'attempts'>
    | Omit<EphemeralModeSessionWipeAuditEvent, 'id' | 'attempts'>;
