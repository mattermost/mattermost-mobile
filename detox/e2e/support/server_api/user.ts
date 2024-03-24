// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {adminPassword, adminUsername} from '@support/test_config';
import {getRandomId} from '@support/utils';

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Users
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
 * Login to Mattermost server as sysadmin.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {user, status} on success or {error, status} on error
 */
export const apiAdminLogin = (baseUrl: string): any => {
    return apiLogin(baseUrl, {
        username: adminUsername,
        password: adminPassword,
    });
};

/**
 * Create a user.
 * See https://api.mattermost.com/#operation/CreateUser
 * @param {string} baseUrl - the base server URL
 * @param {string} option.prefix - prefix to email and username
 * @param {Object} option.user - user object to be created
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiCreateUser = async (baseUrl: string, {prefix = 'user', user = null}: any = {}): Promise<any> => {
    try {
        const newUser = user || generateRandomUser({prefix});

        const response = await client.post(
            `${baseUrl}/api/v4/users`,
            newUser,
        );

        return {user: {...response.data, newUser}};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Deactivate a user account.
 * See https://api.mattermost.com/#operation/DeleteUser
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDeactivateUser = async (baseUrl: string, userId: string): Promise<any> => {
    try {
        const response = await client.delete(`${baseUrl}/api/v4/users/${userId}`);

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Demote a user to a guest.
 * See https://api.mattermost.com/#operation/DemoteUserToGuest
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDemoteUserToGuest = async (baseUrl: string, userId: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/users/${userId}/demote`);

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get user from a current session.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetMe = (baseUrl: string): any => {
    return apiGetUserById(baseUrl, 'me');
};

/**
 * Get a user by ID.
 * See https://api.mattermost.com/#operation/GetUser
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetUserById = async (baseUrl: string, userId: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/${userId}`);

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get a user by username.
 * See https://api.mattermost.com/#operation/GetUserByUsername
 * @param {string} baseUrl - the base server URL
 * @param {string} username - the username
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetUserByUsername = async (baseUrl: string, username: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/username/${username}`);

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Login to Mattermost server.
 * See https://api.mattermost.com/#operation/Login
 * @param {string} baseUrl - the base server URL
 * @param {string} user.username - username of a user
 * @param {string} user.password - password of a user
 * @return {Object} returns {user, status} on success or {error, status} on error
 */
export const apiLogin = async (baseUrl: string, user: any): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/users/login`,
            {login_id: user.username, password: user.password},
        );

        const {data, status} = response;

        return {
            status,
            user: data,
        };
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Logout from the Mattermost server.
 * See https://api.mattermost.com/#operation/Logout
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {status} on success
 */
export const apiLogout = async (baseUrl: string): Promise<any> => {
    const response = await client.post(`${baseUrl}/api/v4/users/logout`);

    return {status: response.status};
};

/**
 * Patch user from a current session.
 * @param {string} baseUrl - the base server URL
 * @param {Object} userData - data to partially update a user
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiPatchMe = (baseUrl: string, userData: string): any => {
    return apiPatchUser(baseUrl, 'me', userData);
};

/**
 * Patch a user.
 * See https://api.mattermost.com/#operation/PatchUser
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {Object} userData - data to partially update a user
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiPatchUser = async (baseUrl: string, userId: string, userData: any): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/users/${userId}/patch`,
            userData,
        );

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update user active status.
 * See https://api.mattermost.com/#operation/UpdateUserActive
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {boolean} active - use true to set the user active, false for inactive
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiUpdateUserActiveStatus = async (baseUrl: string, userId: string, active: boolean): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/users/${userId}/active`,
            {active},
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const generateRandomUser = ({prefix = 'user', randomIdLength = 6} = {}) => {
    const randomId = getRandomId(randomIdLength);

    return {
        email: `${prefix}${randomId}@sample.mattermost.com`,
        username: `${prefix}${randomId}`,
        password: `P${randomId}!1234`,
        first_name: `F${randomId}`,
        last_name: `L${randomId}`,
        nickname: `N${randomId}`,
        position: `P${randomId}`,
    };
};

export const User = {
    apiAdminLogin,
    apiCreateUser,
    apiDeactivateUser,
    apiDemoteUserToGuest,
    apiGetMe,
    apiGetUserById,
    apiGetUserByUsername,
    apiLogin,
    apiLogout,
    apiPatchMe,
    apiPatchUser,
    apiUpdateUserActiveStatus,
    generateRandomUser,
};

export default User;
