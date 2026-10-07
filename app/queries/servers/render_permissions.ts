// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, shareReplay, switchMap} from 'rxjs/operators';

import {observeRedactionEnforced, observeRequiredRedactionEpoch} from '@actions/local/redaction';
import {License} from '@constants';
import RenderPermissionsStore from '@store/render_permissions_store';
import {isMinimumLicenseTier} from '@utils/helpers';
import {resolveRenderPermission, shouldFetchRenderPermissions} from '@utils/render_permissions';

import {observeLicense} from './system';

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

// Shared per database like observeRedactionEnforced: the write check of every post row reads it.
const channelAccessEnforcedStreams = new WeakMap<Database, Observable<boolean>>();

const observeChannelAccessEnforced = (database: Database): Observable<boolean> => {
    const existing = channelAccessEnforcedStreams.get(database);
    if (existing) {
        return existing;
    }

    const stream = combineLatest([
        observeRedactionEnforced(database),
        observeLicense(database),
    ]).pipe(
        map(([enforced, license]) => enforced && isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced)),
        distinctUntilChanged(),
        shareReplay({bufferSize: 1, refCount: true}),
    );
    channelAccessEnforcedStreams.set(database, stream);
    return stream;
};

/**
 * Whether an ABAC policy denies the current user a channel access action (write, management). Only
 * while ABAC is enforced on Enterprise Advanced: below it the server does not enforce channel access,
 * while the decisions API still fails closed, so its denies there would lock controls the server
 * allows. On Enterprise Advanced a fail-closed deny (one with a reason) counts, as enforcement fails
 * closed too. Emits false until a decision is stored; it never fetches one itself (see
 * useFetchRenderPermissions).
 */
export const observeChannelActionDenied = (
    database: Database,
    serverUrl: string,
    channelId: string,
    action: RenderPermissionActionName,
): Observable<boolean> => {
    return observeChannelAccessEnforced(database).pipe(
        switchMap((enforced) => (enforced ? RenderPermissionsStore.observeEntry(serverUrl, channelId) : of$(undefined))),
        map((entry) => {
            const decision = entry?.decisions[action];
            return Boolean(decision?.evaluated && !decision.allowed);
        }),
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
