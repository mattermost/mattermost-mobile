// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

import client from './server_api/client';
import User from './server_api/user';
import {adminEmail, adminPassword} from './test_config';

type LockoutFix = {
    reason: string;

    /** The config patch that clears it through the admin's own session; absent when the admin cannot get one. */
    patch?: Record<string, unknown>;
};

// Settings that lock the admin out, keyed by the server error id they cause. e2e-test-stack servers have no
// mmctl --local, so only a lockout the admin can still patch its way out of is cleared; the rest fail with the cause.
const LOCKOUT_FIXES: Readonly<Record<string, LockoutFix>> = {
    'api.team.is_team_creation_allowed.domain.app_error': {
        reason: 'team creation is restricted to domains that exclude the admin account',
        patch: {TeamSettings: {RestrictCreationToDomains: ''}},
    },
    'api.user.login.not_verified.app_error': {reason: 'email verification is required and the admin email is unverified'},
    'mfa.validate_token.authenticate.app_error': {reason: 'MFA is enabled and the admin is enrolled'},
    'api.context.mfa_required.app_error': {reason: 'MFA is enforced and the admin is not enrolled'},
};

/** Returned when sign-in by username is disabled; the admin can still sign in by email and the baseline re-enables it. */
const USERNAME_SIGN_IN_DISABLED = 'api.user.login.invalid_credentials_email';

const errorId = (error: unknown): string => {
    const id = (error as {id?: unknown} | null | undefined)?.id;
    return typeof id === 'string' ? id : '';
};

const unclearableLockout = (baseUrl: string, id: string, fix: LockoutFix) =>
    new Error(`Admin is locked out of ${baseUrl}: ${fix.reason} (${id}). The server has no mmctl --local to clear it; recreate the server.`);

/**
 * Clears the admin lockout `error` names, when the admin can clear it with a config patch.
 * @param {string} baseUrl - the base server URL
 * @param {unknown} error - a Mattermost API error body
 * @return {boolean} true when a lockout was cleared, false when `error` is no known lockout
 * @throws when `error` is a known lockout the admin cannot clear, or the clearing patch fails
 */
export async function clearAdminLockout(baseUrl: string, error: unknown): Promise<boolean> {
    const id = errorId(error);
    const fix = LOCKOUT_FIXES[id];
    if (!fix) {
        return false;
    }
    if (!fix.patch) {
        throw unclearableLockout(baseUrl, id, fix);
    }

    console.warn(`[admin_lockout] ${baseUrl}: ${fix.reason}; clearing ${Object.keys(fix.patch).join(', ')}`);
    try {
        await client.put(`${baseUrl}/api/v4/config/patch`, fix.patch);
    } catch (patchError) {
        const status = (patchError as {response?: {status?: number}}).response?.status ?? 0;
        throw new Error(`Admin is locked out of ${baseUrl} (${fix.reason}) and clearing it failed (HTTP ${status})`);
    }
    return true;
}

/**
 * Admin login that falls back to the admin email when username sign-in is disabled, and fails with the cause on a
 * lockout no login can get past.
 * @param {string} baseUrl - the base server URL
 * @return {Object} the login result, {user, status} or {error, status}
 */
export async function apiAdminLoginClearingLockout(baseUrl: string): Promise<any> {
    const result = await User.apiAdminLogin(baseUrl);
    if (!result.error) {
        return result;
    }

    const id = errorId(result.error);
    if (id === USERNAME_SIGN_IN_DISABLED) {
        const byEmail = await User.apiLogin(baseUrl, {username: adminEmail, password: adminPassword});
        if (!byEmail.error) {
            console.warn(`[admin_lockout] ${baseUrl}: sign-in by username is disabled; signed in by email`);
        }
        return byEmail;
    }
    const fix = LOCKOUT_FIXES[id];
    if (fix && !fix.patch) {
        throw unclearableLockout(baseUrl, id, fix);
    }
    return result;
}
