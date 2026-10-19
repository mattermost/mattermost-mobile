// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {captureRedactionEpoch} from '@actions/local/redaction';
import {RENDER_PERMISSIONS_VERSION} from '@constants/versions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import RenderPermissionsStore, {RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {isMinimumServerVersion} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

// The request is malformed, the channel is not readable, or the route does not exist: asking again
// soon gets the same answer.
const PERMANENT_FAILURE_STATUSES = new Set([400, 403, 404]);

/**
 * Fetches the current user's render-time ABAC decisions for every action the server registers on a
 * channel, and stores them against the redaction epoch captured before dispatch. A response that lands
 * after an ABAC invalidation is therefore stored already due for revalidation.
 *
 * Deduplicated per channel while in flight, so any number of callers is cheap. Skipped when ABAC is
 * not enforced (the server would answer with each action's default) and on servers without the API.
 * @param serverUrl - The server URL
 * @param channelId - The channel the decisions are for
 * @returns The decisions keyed by action name, an error, or neither when the request was skipped
 */
export async function fetchRenderPermissions(serverUrl: string, channelId: string) {
    const claim = RenderPermissionsStore.startFetch(serverUrl, channelId);
    if (!claim) {
        return {};
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const serverVersion = await getConfigValue(database, 'Version');
        if (!isMinimumServerVersion(serverVersion, ...RENDER_PERMISSIONS_VERSION)) {
            RenderPermissionsStore.finishFetch(serverUrl, channelId, claim);
            return {};
        }

        // Undefined while ABAC is not enforced.
        const epoch = await captureRedactionEpoch(serverUrl);
        if (epoch === undefined) {
            RenderPermissionsStore.finishFetch(serverUrl, channelId, claim);
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);
        let response: ActionSearchResponse;
        try {
            response = await client.searchChannelActionDecisions(channelId);
        } catch (error) {
            // The request itself failed: the server refused it or could not be reached. The previous
            // decisions are kept, since a failure says nothing new about the policy, and stored under the
            // current epoch so callers wait before asking again.
            logDebug('error on fetchRenderPermissions', getFullErrorMessage(error));
            forceLogoutIfNecessary(serverUrl, error);
            const isPermanent = isErrorWithStatusCode(error) && PERMANENT_FAILURE_STATUSES.has(error.status_code);
            const ttlMs = isPermanent ? RENDER_PERMISSIONS_TTL_MS : RenderPermissionsStore.nextRetryDelay(serverUrl, channelId);
            const previous = RenderPermissionsStore.getEntry(serverUrl, channelId);
            RenderPermissionsStore.finishFetch(serverUrl, channelId, claim, {epoch, decisions: previous?.decisions ?? {}}, ttlMs);
            return {error};
        }

        const {decisions = {}} = response;

        // A reason is only ever set on a fail-closed deny caused by an evaluation error.
        const evaluationFailed = Object.values(decisions).some((decision) => Boolean(decision.reason));
        let ttlMs = RENDER_PERMISSIONS_TTL_MS;
        if (evaluationFailed) {
            ttlMs = RenderPermissionsStore.nextRetryDelay(serverUrl, channelId);
        } else {
            RenderPermissionsStore.resetRetryDelay(serverUrl, channelId);
        }
        RenderPermissionsStore.finishFetch(serverUrl, channelId, claim, {epoch, decisions}, ttlMs);
        return {decisions};
    } catch (error) {
        // Anything other than the request failing (a database read, a missing client, a bug) is not
        // fixed by retrying on a timer: nothing is stored, and the next trigger asks again.
        logError('error on fetchRenderPermissions', getFullErrorMessage(error));
        RenderPermissionsStore.finishFetch(serverUrl, channelId, claim);
        return {error};
    }
}
