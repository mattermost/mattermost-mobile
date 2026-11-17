// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AccessControl, Channel, Setup, Team, User} from '@support/server_api';
import {getResponseFromError} from '@support/server_api/common';
import {assertServerBaseline} from '@support/server_baseline';
import {timeouts} from '@support/utils';
import {pollUntilConverged, type ConvergeResult} from '@support/utils/converge';
import {withTransportRetry} from '@support/utils/transport_retry';
import axios from 'axios';

import {logInfo} from '../../provision/log';

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
 * Creates a public channel for an ABAC suite, retrying transient server errors and throwing with the server's
 * error instead of leaving the caller to dereference a missing channel (9a4b375: a timed-out create, then 404).
 * Each attempt uses a fresh random name, so a retry cannot duplicate the channel.
 * @param baseUrl - the server URL
 * @param teamId - the team to create it in
 * @param prefix - the channel name prefix
 * @returns the created channel
 */
export const createAbacChannel = async (baseUrl: string, teamId: string, prefix: string) => {
    const {channel, error} = await Setup.retryTransient(() => Channel.apiCreateChannel(baseUrl, {teamId, type: 'O', prefix}), 'apiCreateChannel');
    if (!channel?.id) {
        throw new Error(`Failed to create the ${prefix} channel: ${JSON.stringify(error)}`);
    }
    return channel;
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

export const setDepartment = async (baseUrl: string, userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(baseUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};

// While the decision is still the old one, the value is written again this often. Every write makes the next
// evaluation refresh the attribute view (invalidateAttributeViewCache), so the gate is the cached subject below,
// not the server's 30s refresh interval.
const REASSERT_INTERVAL_MS = 10 * 1000;

/**
 * Sets the user's Department and waits until the server's own decision for `action` on the channel reflects it,
 * throwing if it does not within the budget.
 *
 * Works around a server defect (reported on the mobile PR that added this; filed against mattermost/mattermost
 * once triaged): an evaluation that runs while another request holds the attribute-view refresh lock
 * (refreshAttributeViewIfStale TryLock) reads the view from before the write, and LocalCacheAttributesStore.GetSubject
 * then caches that stale subject for 15 minutes, which the later view refresh does not drop. A user can keep their
 * old permission that long. Writing the same value again drops the cached subject, so it is repeated while the
 * decision has not moved.
 * TODO: drop the reassert once the server stops caching subjects read from a stale view.
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
    timeoutMs: number = timeouts.ONE_MIN,
) => {
    const write = () => setDepartment(baseUrl, user.id, fieldId, department);
    await write();
    const result = await pollServerActionDecision(baseUrl, user, channelId, action, allowed, timeoutMs, write);
    logInfo(`convergeDepartment: ${action} ${allowed ? 'allowed' : 'denied'} for user ${user.id}: converged=${result.converged} reasserts=${result.reasserts} elapsedMs=${result.elapsedMs}`);
    if (!result.converged) {
        throw new Error(`Server still ${allowed ? 'denies' : 'allows'} ${action} for user ${user.id} ${timeoutMs / 1000}s after setting Department to ${department} (${result.reasserts} re-writes)`);
    }
};

/**
 * Polls the server's own render-decision endpoint as the given user until it evaluates the action
 * as allowed/denied, or the timeout elapses. The shared API client carries the admin session, so
 * this logs in with a bearer token instead of disturbing it. Throws when it cannot log in as the user, and
 * when reassert throws; a failed poll only counts as not converged.
 * @param baseUrl - the server URL
 * @param user - the user the decision is evaluated for
 * @param channelId - the channel the decision is for
 * @param action - the ABAC action name, e.g. upload_file_attachment
 * @param allowed - the decision to wait for
 * @param timeoutMs - the polling budget
 * @param reassert - run every REASSERT_INTERVAL_MS while the decision is still the old one
 * @returns the convergence result, with the number of re-writes and the time it took
 */
const pollServerActionDecision = async (
    baseUrl: string,
    user: {id?: string; username: string; password: string},
    channelId: string,
    action: string,
    allowed: boolean,
    timeoutMs: number,
    reassert?: () => Promise<void>,
): Promise<ConvergeResult> => {
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
        }, {idempotent: false, allowDuplicateWrites: true, label: 'pollServerActionDecision login', budgetMs: timeouts.ONE_MIN});
        token = loginResult.token;
        if (!token) {
            throw new Error(`Could not log in as user ${user.id ?? '(unknown id)'} to read its ABAC decision: ${JSON.stringify(loginResult.error)}`);
        }

        const headers = {Authorization: `Bearer ${token}`};
        return await pollUntilConverged(async () => {
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
        }, {timeoutMs, pollIntervalMs: timeouts.TWO_SEC, reassert, reassertIntervalMs: REASSERT_INTERVAL_MS});
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
