// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {RenderPermissionActionName} from '@constants/access_control';
import type {RenderPermissionsEntry} from '@store/render_permissions_store';

/**
 * Whether the decisions for a channel have to be (re)fetched: only while ABAC is enforced, and when
 * none are stored, they expired, or an ABAC invalidation happened after they were requested.
 */
export function shouldFetchRenderPermissions(enforced: boolean, requiredEpoch: number, entry?: RenderPermissionsEntry): boolean {
    if (!enforced) {
        return false;
    }
    return !entry || Boolean(entry.expired) || entry.epoch < requiredEpoch;
}

/**
 * The decision to render for an action. The last known decision is kept while it is revalidated, so a
 * control does not flip to its default and back on every refresh; the server enforces every action on
 * its own, so the client only decides how the control looks. With no evaluated decision yet, the
 * caller's default applies.
 */
export function resolveRenderPermission(
    enforced: boolean,
    entry: RenderPermissionsEntry | undefined,
    action: RenderPermissionActionName,
    defaultAllowed: boolean,
): boolean {
    if (!enforced) {
        return defaultAllowed;
    }

    const decision = entry?.decisions[action];
    if (!decision?.evaluated) {
        return defaultAllowed;
    }
    return decision.allowed;
}
