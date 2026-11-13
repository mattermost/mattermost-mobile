// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AccessControl} from '@support/server_api';
import {getResponseFromError} from '@support/server_api/common';
import {assertServerBaseline} from '@support/server_baseline';
import {timeouts, wait} from '@support/utils';
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

export const setDepartment = async (baseUrl: string, userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(baseUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};

/**
 * Polls the server's own render-decision endpoint as the given user until it evaluates the action
 * as allowed/denied, or the timeout elapses. The shared API client carries the admin session, so
 * this logs in with a bearer token instead of disturbing it. Returns false rather than throwing
 * on timeout or transport failure, so callers in cleanup can decide whether to surface it.
 */
export const waitForServerActionDecision = async (
    baseUrl: string,
    user: {username: string; password: string},
    channelId: string,
    action: string,
    allowed: boolean,
    timeoutMs: number = timeouts.ONE_MIN,
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
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const search = await axios.post(
                    `${baseUrl}/api/v4/access_control/decisions/actions/search`,
                    {resource: {type: 'channel', id: channelId}},
                    {headers, timeout: timeouts.TEN_SEC},
                );
                const decision = search.data?.decisions?.[action];
                if (decision?.evaluated === true && decision?.allowed === allowed) {
                    return true;
                }
            } catch {
                // A failed poll says nothing new about the decision; keep polling until the deadline.
            }
            if (Date.now() >= deadline) {
                return false;
            }
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC);
        }
    } catch {
        return false;
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
