// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientEphemeralModeMix {
    logOfflinePurge: (offlineTimeMinutes: number, purgeAt: number, errorReason?: string) => Promise<{status: string}>;
    logCleanup: (postsDeleted: number, cleanupAt: number, errorReason?: string) => Promise<{status: string}>;
    logSessionWipe: (userId: string, wipeAt: number, errorReason?: string) => Promise<{status: string}>;
}

const ClientEphemeralMode = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    logOfflinePurge = async (offlineTimeMinutes: number, purgeAt: number, errorReason?: string) => {
        return this.doFetch(
            `${this.urlVersion}/ephemeral_mode/purge`,
            {method: 'post', body: {offline_time_minutes: offlineTimeMinutes, purge_at: purgeAt, error_reason: errorReason}},
        );
    };

    logCleanup = async (postsDeleted: number, cleanupAt: number, errorReason?: string) => {
        return this.doFetch(
            `${this.urlVersion}/ephemeral_mode/cleanup`,
            {method: 'post', body: {posts_deleted: postsDeleted, cleanup_at: cleanupAt, error_reason: errorReason}},
        );
    };

    logSessionWipe = async (userId: string, wipeAt: number, errorReason?: string) => {
        return this.doFetch(
            `${this.urlVersion}/ephemeral_mode/wipe`,
            {method: 'post', body: {user_id: userId, wipe_at: wipeAt, error_reason: errorReason}},
        );
    };
};

export default ClientEphemeralMode;
