// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {generateTotp} from '@support/utils/totp';

import client from './client';
import {getResponseFromError} from './common';
import User from './user';

// ****************************************************************
// MFA
// See https://api.mattermost.com/#tag/users
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Generate an MFA secret for the current user.
 * See https://api.mattermost.com/#operation/GenerateMfaSecret
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {secret, qrCode} on success or {error, status} on error
 */
export const apiGenerateMfaSecret = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/users/me/mfa/generate`);

        return {secret: response.data.secret, qrCode: response.data.qr_code};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Activate MFA for the current user using a TOTP code.
 * See https://api.mattermost.com/#operation/UpdateUserMfa
 * @param {string} baseUrl - the base server URL
 * @param {string} code - the TOTP code generated from the secret
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiActivateMfa = async (baseUrl: string, code: string): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/users/me/mfa`,
            {activate: true, code},
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable MFA for a user and return the base32 secret so the caller can
 * compute TOTP codes for the in-app login flow.
 *
 * MFA secret generation/activation are current-user endpoints, so this logs in
 * as the target user (switching the shared client session), enables MFA, and
 * leaves the session as the target user. Callers that still need the admin
 * session must re-login afterwards.
 *
 * @param {string} baseUrl - the base server URL
 * @param {Object} user - user object with `username` and `password`
 * @return {Object} returns {secret} on success or {error, status} on error
 */
export const apiEnableMfaForUser = async (baseUrl: string, user: {username: string; password: string}): Promise<any> => {
    const loginResult = await User.apiLogin(baseUrl, user);
    if (loginResult.error) {
        return loginResult;
    }

    const generateResult = await apiGenerateMfaSecret(baseUrl);
    if (generateResult.error) {
        return generateResult;
    }

    const {secret} = generateResult;
    const code = generateTotp(secret);

    const activateResult = await apiActivateMfa(baseUrl, code);
    if (activateResult.error) {
        return activateResult;
    }

    return {secret};
};

export const Mfa = {
    apiActivateMfa,
    apiEnableMfaForUser,
    apiGenerateMfaSecret,
};

export default Mfa;
