// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const REVISION = /^(0|[1-9][0-9]*)$/;

export const compareTaskActivityRevisions = (left: string, right: string): number => {
    if (left.length !== right.length) {
        return Math.sign(left.length - right.length);
    }
    if (left < right) {
        return -1;
    }
    return left > right ? 1 : 0;
};

export const parseTaskActivitySync = (value: unknown, complete: boolean): TaskActivitySync | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    const sync = value as Partial<TaskActivitySync>;
    if (sync.version !== 1 || sync.complete !== complete ||
        typeof sync.epoch !== 'string' || !sync.epoch ||
        typeof sync.revision !== 'string' || !REVISION.test(sync.revision)) {
        return undefined;
    }
    if (!complete && (typeof sync.base_revision !== 'string' || !REVISION.test(sync.base_revision))) {
        return undefined;
    }
    return sync as TaskActivitySync;
};

export const isValidCertifiedTaskLink = (item: PlaybookChecklistItem, event: TimelineEvent | undefined, runId: string): boolean => {
    if (item.state_event_id === null) {
        return true;
    }
    if (!item.state_event_id || !event || event.playbook_run_id !== runId || event.event_at !== item.state_modified) {
        return false;
    }
    try {
        const details = JSON.parse(event.details) as {action?: unknown; item_id?: unknown};
        if (details.item_id !== item.id) {
            return false;
        }
        switch (item.state) {
            case 'closed': return details.action === 'check';
            case 'skipped': return details.action === 'skip';
            case '': return details.action === 'uncheck' || details.action === 'restore';
            default: return false;
        }
    } catch {
        return false;
    }
};
