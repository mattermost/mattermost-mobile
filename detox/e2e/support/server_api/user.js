// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import testConfig from '@support/test_config';
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
 * @return {Object} returns {user, status} on success or {error, status} on error
 */
export const apiAdminLogin = () => {
    return apiLogin({
        username: testConfig.adminUsername,
        password: testConfig.adminPassword,
    });
};

/**
 * Create a user.
 * See https://api.mattermost.com/#operation/CreateUser
 * @param {Object} user - user object to be created
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiCreateUser = async ({prefix = 'user', user = null} = {}) => {
    try {
        const newUser = user || generateRandomUser(prefix);

        const response = await client.post(
            '/api/v4/users',
            newUser,
        );

        return {user: {...response.data, password: newUser.password}};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Deactivate a user account.
 * See https://api.mattermost.com/#operation/DeleteUser
 * @param {string} userId - the user ID
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDeactivateUser = async (userId) => {
    try {
        const response = await client.delete(`/api/v4/users/${userId}`);

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Demote a user to a guest.
 * See https://api.mattermost.com/#operation/DemoteUserToGuest
 * @param {string} userId - the user ID
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDemoteUserToGuest = async (userId) => {
    try {
        const response = await client.post(`/api/v4/users/${userId}/demote`);

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get user from a current session.
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetMe = () => {
    return apiGetUserById('me');
};

/**
 * Get a user by ID.
 * See https://api.mattermost.com/#operation/GetUser
 * @param {string} userId - the user ID
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetUserById = async (userId) => {
    try {
        const response = await client.get(`/api/v4/users/${userId}`);

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get a user by username.
 * See https://api.mattermost.com/#operation/GetUserByUsername
 * @param {string} username - the username
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiGetUserByUsername = async (username) => {
    try {
        const response = await client.get(`/api/v4/users/username/${username}`);

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Login to Mattermost server.
 * See https://api.mattermost.com/#operation/Login
 * @param {string} user.username - username of a user
 * @param {string} user.password - password of a user
 * @return {Object} returns {user, status} on success or {error, status} on error
 */
export const apiLogin = async (user) => {
    try {
        const response = await client.post(
            '/api/v4/users/login',
            {login_id: user.username, password: user.password},
        );

        const {data, headers, status} = response;

        // Get MMAUTHTOKEN cookie and attach to the client instance
        const [mmAuthToken] = headers['set-cookie'];
        client.defaults.headers.Cookie = mmAuthToken;

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
 * @return {Object} returns data on success
 */
export const apiLogout = async () => {
    const response = await client.post('/api/v4/users/logout');

    client.defaults.headers.Cookie = '';

    return response.data;
};

/**
 * Patch user from a current session.
 * @param {Object} userData - data to partially update a user
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiPatchMe = (userData) => {
    return apiPatchUser('me', userData);
};

/**
 * Patch a user.
 * See https://api.mattermost.com/#operation/PatchUser
 * @param {string} userId - the user ID
 * @param {Object} userData - data to partially update a user
 * @return {Object} returns {user} on success or {error, status} on error
 */
export const apiPatchUser = async (userId, userData) => {
    try {
        const response = await client.put(
            `/api/v4/users/${userId}/patch`,
            userData,
        );

        return {user: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

function generateRandomUser(prefix) {
    const randomId = getRandomId();

    return {
        email: `${prefix}${randomId}@sample.mattermost.com`,
        username: `${prefix}${randomId}`,
        password: 'passwd',
        first_name: `First${randomId}`,
        last_name: `Last${randomId}`,
        nickname: `Nickname${randomId}`,
        position: `Position${randomId}`,
    };
}

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
};

export default User;
