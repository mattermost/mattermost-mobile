// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import jestExpect from 'expect';

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// LDAP
// See https://api.mattermost.com/#tag/LDAP
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Synchronize any user attribute changes in the configured AD/LDAP server with Mattermost.
 * See https://api.mattermost.com/#operation/SyncLdap
 * @param {string} baseUrl - the base server URL
 * @return {string} returns response on success or {error, status} on error
 */
export const apiLDAPSync = async (baseUrl: string): Promise<any> => {
    try {
        return await client.post(`${baseUrl}/api/v4/ldap/sync`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Test the current AD/LDAP configuration to see if the AD/LDAP server can be contacted successfully.
 * See https://api.mattermost.com/#operation/TestLdap
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiLDAPTest = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/ldap/test`);

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Check that LDAP server can connect and is synchronized with Mattermost server.
 * @param {string} baseUrl - the base server URL
 */
export const apiRequireLDAPServer = async (baseUrl: string): Promise<any> => {
    const {error: testError} = await apiLDAPTest(baseUrl);
    jestExpect(testError).toBeUndefined();

    const {error: syncError} = await apiLDAPSync(baseUrl);
    jestExpect(syncError).toBeUndefined();
};

export const Ldap = {
    apiLDAPSync,
    apiLDAPTest,
    apiRequireLDAPServer,
};

export default Ldap;
