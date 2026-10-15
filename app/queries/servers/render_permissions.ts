// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeRedactionEnforced, observeRequiredRedactionEpoch} from '@actions/local/redaction';
import {RENDER_PERMISSIONS_VERSION} from '@constants/versions';
import RenderPermissionsStore from '@store/render_permissions_store';
import {isMinimumServerVersion} from '@utils/helpers';
import {resolveRenderPermission, shouldFetchRenderPermissions} from '@utils/render_permissions';

import {observeConfigValue} from './system';

import type {RenderPermissionActionName} from '@constants/access_control';
import type {Database} from '@nozbe/watermelondb';

/**
 * Whether render-time decisions apply: ABAC is enforced and the server has the decisions API. Below
 * that version no decision can ever be fetched, so actions render as they would without ABAC.
 */
const observeRenderPermissionsEnforced = (database: Database): Observable<boolean> => {
    return combineLatest([
        observeRedactionEnforced(database),
        observeConfigValue(database, 'Version'),
    ]).pipe(
        map(([enforced, version]) => enforced && isMinimumServerVersion(version, ...RENDER_PERMISSIONS_VERSION)),
        distinctUntilChanged(),
    );
};

/**
 * Whether the current user may perform an action in a channel, as decided by ABAC permission
 * policies. Emits `allowWhenUnenforced` while ABAC is not enforced or the server predates the decisions
 * API, and `allowWhenNotEvaluated` until a decision is stored; it never fetches one itself (see
 * useFetchRenderPermissions).
 */
export const observeRenderPermission = (
    database: Database,
    serverUrl: string,
    channelId: string | undefined,
    action: RenderPermissionActionName,
    allowWhenUnenforced: boolean,
    allowWhenNotEvaluated = allowWhenUnenforced,
): Observable<boolean> => {
    return combineLatest([
        observeRenderPermissionsEnforced(database),
        channelId ? RenderPermissionsStore.observeEntry(serverUrl, channelId) : of$(undefined),
    ]).pipe(
        map(([enforced, entry]) => resolveRenderPermission(enforced, entry, action, allowWhenUnenforced, allowWhenNotEvaluated)),
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
        observeRenderPermissionsEnforced(database),
        observeRequiredRedactionEpoch(database, channelId),
        RenderPermissionsStore.observeEntry(serverUrl, channelId),
    ]).pipe(
        map(([enforced, requiredEpoch, entry]) => shouldFetchRenderPermissions(enforced, requiredEpoch, entry)),
    );
};
