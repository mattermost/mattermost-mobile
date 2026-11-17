// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AccessControl, Channel, Team, User} from '@support/server_api';
import {getResponseFromError} from '@support/server_api/common';
import {assertServerBaseline} from '@support/server_baseline';
import {timeouts} from '@support/utils';
import {pollUntilConverged} from '@support/utils/converge';
import {withTransportRetry} from '@support/utils/transport_retry';
import axios from 'axios';

// Server state the ABAC suites rely on; provisioning sets it, the suites only check it.
const ABAC_BASELINE_KEYS = [
    'FeatureFlags.PermissionPolicies',
    'FeatureFlags.ChannelPermissionPolicies',
    'AccessControlSettings.EnableAttributeBasedAccessControl',
    'AccessControlSettings.EnableUserManagedAttributes',
    'ServiceSettings.AllowCorsFrom',
];

export const assertAbacBaseline = (baseUrl: string) => assertServerBaseline(baseUrl, ABAC_BASELINE_KEYS);

/**
 * The provisioned "Department" profile attribute. Shared by every ABAC suite, so suites must never
 * create or delete it themselves.
 */
export const getProvisionedDepartmentField = async (baseUrl: string): Promise<{id: string; name: string}> => {
    const {fields, error} = await AccessControl.apiGetCustomProfileAttributeFields(baseUrl);
    if (error) {
        throw new Error(`Failed to list profile attribute fields: ${JSON.stringify(error)}`);
    }
    const field = (fields as Array<{id: string; name: string; delete_at?: number}>).find((f) => f.name === 'Department' && !f.delete_at);
    if (!field) {
        throw new Error('The "Department" profile attribute is missing; provisioning must run first');
    }
    return field;
};

/**
 * Creates a user and adds them to the team and channel, throwing with the server's error instead of leaving the
 * caller to dereference a missing user.
 * @param baseUrl - the server URL
 * @param teamId - the team to join
 * @param channelId - the channel to join
 * @param prefix - the username prefix
 * @returns the created user, including its password
 */
export const createChannelMember = async (baseUrl: string, teamId: string, channelId: string, prefix: string) => {
    const {user, error} = await User.apiCreateUser(baseUrl, {prefix});
    if (!user) {
        throw new Error(`Failed to create the ${prefix} user: ${JSON.stringify(error)}`);
    }
    const team = await Team.apiAddUserToTeam(baseUrl, user.id, teamId);
    if (team.error) {
        throw new Error(`Failed to add the ${prefix} user to the team: ${JSON.stringify(team.error)}`);
    }
    const channel = await Channel.apiAddUserToChannel(baseUrl, user.id, channelId);
    if (channel.error) {
        throw new Error(`Failed to add the ${prefix} user to the channel: ${JSON.stringify(channel.error)}`);
    }
    return user;
};

/**
 * Awaits every promise, then rethrows the first rejection. Unlike Promise.all, nothing is left running once the
 * caller moves on.
 * @param promises - the work to wait for
 */
export const allOrFirstError = async (promises: Array<Promise<unknown>>) => {
    const results = await Promise.allSettled(promises);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) {
        throw failure.reason;
    }
};

export const setDepartment = async (baseUrl: string, userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(baseUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};

/**
 * Sets the user's Department and waits until the server's own decision for `action` on the channel reflects it,
 * throwing if it does not within the budget.
 *
 * The server can keep answering from the old value long after the write: an evaluation that runs while another
 * request holds the attribute-view refresh lock reads the view from before the write, and the per-user subject it
 * builds from it stays cached for 15 minutes, because the later view refresh does not drop it
 * (refreshAttributeViewIfStale and LocalCacheAttributesStore.GetSubject in the server). Writing the same value
 * again drops that cached subject, so it is repeated once per server refresh interval until the decision moves.
 * @param baseUrl - the server URL
 * @param user - the user whose attribute changes; the decision is evaluated as them
 * @param fieldId - the Department field id
 * @param department - the value to set
 * @param channelId - the channel the decision is for
 * @param action - the ABAC action name
 * @param allowed - the decision the value should produce
 * @param timeoutMs - the budget for the server to reach it
 */
export const convergeDepartment = async (
    baseUrl: string,
    user: {id: string; username: string; password: string},
    fieldId: string,
    department: string,
    channelId: string,
    action: string,
    allowed: boolean,
    timeoutMs: number = timeouts.TWO_MIN,
) => {
    const write = () => setDepartment(baseUrl, user.id, fieldId, department);
    await write();
    const converged = await waitForServerActionDecision(baseUrl, user, channelId, action, allowed, timeoutMs, write);
    if (!converged) {
        throw new Error(`Server still ${allowed ? 'denies' : 'allows'} ${action} for user ${user.id} ${timeoutMs / 1000}s after setting Department to ${department}`);
    }
};

/**
 * The server refreshes its attribute view at most this often (attributeViewRefreshInterval in
 * server/channels/app/access_control.go).
 */
export const SERVER_ATTRIBUTE_VIEW_REFRESH_MS = 30 * 1000;

/**
 * Polls the server's own render-decision endpoint as the given user until it evaluates the action
 * as allowed/denied, or the timeout elapses. The shared API client carries the admin session, so
 * this logs in with a bearer token instead of disturbing it. Returns false rather than throwing
 * on timeout or transport failure, so callers in cleanup can decide whether to surface it.
 * @param baseUrl - the server URL
 * @param user - the user the decision is evaluated for
 * @param channelId - the channel the decision is for
 * @param action - the ABAC action name, e.g. upload_file_attachment
 * @param allowed - the decision to wait for
 * @param timeoutMs - the polling budget
 * @param reassert - run once per SERVER_ATTRIBUTE_VIEW_REFRESH_MS while the decision is still the old one; its
 * errors propagate instead of returning false
 * @returns whether the server reached the decision within the budget
 */
export const waitForServerActionDecision = async (
    baseUrl: string,
    user: {username: string; password: string},
    channelId: string,
    action: string,
    allowed: boolean,
    timeoutMs: number = timeouts.ONE_MIN,
    reassert?: () => Promise<void>,
): Promise<boolean> => {
    let token: string | undefined;
    try {
        // Password-only login, so a replay on a dropped connection is safe (same reasoning as
        // apiLogin); errors are returned in {error, status} form for the retry helper to classify.
        const loginResult = await withTransportRetry(async (): Promise<{token?: string; error?: unknown; status?: number}> => {
            try {
                const login = await axios.post(
                    `${baseUrl}/api/v4/users/login`,
                    {login_id: user.username, password: user.password},
                    {timeout: timeouts.TEN_SEC},
                );
                return {token: login.headers.token as string | undefined};
            } catch (err) {
                return getResponseFromError(err);
            }
        }, {idempotent: false, allowDuplicateWrites: true, label: 'waitForServerActionDecision login', budgetMs: timeouts.ONE_MIN});
        token = loginResult.token;
        if (!token) {
            return false;
        }

        const headers = {Authorization: `Bearer ${token}`};
        const {converged} = await pollUntilConverged(async () => {
            try {
                const search = await axios.post(
                    `${baseUrl}/api/v4/access_control/decisions/actions/search`,
                    {resource: {type: 'channel', id: channelId}},
                    {headers, timeout: timeouts.TEN_SEC},
                );
                const decision = search.data?.decisions?.[action];
                return decision?.evaluated === true && decision?.allowed === allowed;
            } catch {
                // A failed poll says nothing new about the decision; keep polling until the deadline.
                return false;
            }
        }, {timeoutMs, pollIntervalMs: timeouts.TWO_SEC, reassert, reassertIntervalMs: SERVER_ATTRIBUTE_VIEW_REFRESH_MS});
        return converged;
    } finally {
        if (token) {
            try {
                await axios.post(`${baseUrl}/api/v4/users/logout`, null, {headers: {Authorization: `Bearer ${token}`}, timeout: timeouts.TEN_SEC});
            } catch {
                // The token expires on its own; a failed logout must not fail the caller.
            }
        }
    }
};
