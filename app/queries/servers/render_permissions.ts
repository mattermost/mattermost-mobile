// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeRedactionEnforced, observeRequiredRedactionEpoch} from '@actions/local/redaction';
import RenderPermissionsStore from '@store/render_permissions_store';
import {resolveRenderPermission, shouldFetchRenderPermissions} from '@utils/render_permissions';

import type {RenderPermissionActionName} from '@constants/access_control';
import type {Database} from '@nozbe/watermelondb';

/**
 * Whether the current user may perform an action in a channel, as decided by ABAC permission
 * policies. Emits `defaultAllowed` until a decision is stored; it never fetches one itself
 * (see useFetchRenderPermissions).
 */
export const observeRenderPermission = (
    database: Database,
    serverUrl: string,
    channelId: string | undefined,
    action: RenderPermissionActionName,
    defaultAllowed: boolean,
): Observable<boolean> => {
    if (!channelId) {
        return of$(defaultAllowed);
    }

    return combineLatest([
        observeRedactionEnforced(database),
        RenderPermissionsStore.observeEntry(serverUrl, channelId),
    ]).pipe(
        map(([enforced, entry]) => resolveRenderPermission(enforced, entry, action, defaultAllowed)),
        distinctUntilChanged(),
    );
};

/**
 * Emits whether the channel's decisions have to be fetched, on every change of what that depends on.
 * Deliberately not deduplicated: an answer stored stale (an invalidation landed while it was in
 * flight) keeps this true, and swallowing that second true would leave the decision unrevalidated.
 */
export const observeShouldFetchRenderPermissions = (database: Database, serverUrl: string, channelId: string): Observable<boolean> => {
    return combineLatest([
        observeRedactionEnforced(database),
        observeRequiredRedactionEpoch(database, channelId),
        RenderPermissionsStore.observeEntry(serverUrl, channelId),
    ]).pipe(
        map(([enforced, requiredEpoch, entry]) => shouldFetchRenderPermissions(enforced, requiredEpoch, entry)),
    );
};
