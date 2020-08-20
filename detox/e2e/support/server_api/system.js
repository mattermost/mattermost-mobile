// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import merge from 'merge-deep';

import testConfig from '@support/test_config';

import client from './client';
import {getResponseFromError} from './common';
import defaultServerConfig from './default_config.json';

// ****************************************************************
// System
// See https://api.mattermost.com/#tag/system
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Get configuration.
 * See https://api.mattermost.com/#tag/system/paths/~1config/get
 */
export const apiGetConfig = async () => {
    try {
        const response = await client.get('/api/v4/config');

        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update configuration.
 * See https://api.mattermost.com/#tag/system/paths/~1config/put
 * @param {Object} newConfig - specific config to update
 */
export const apiUpdateConfig = async (newConfig = {}) => {
    try {
        const {config: currentConfig} = await apiGetConfig();
        const config = merge(currentConfig, getDefaultConfig(), newConfig);

        const response = await client.put(
            '/api/v4/config',
            config,
        );

        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

const getDefaultConfig = () => {
    const fromEnv = {
        ServiceSettings: {SiteURL: testConfig.siteUrl},
    };

    return merge(defaultServerConfig, fromEnv);
};

export const System = {
    apiGetConfig,
    apiUpdateConfig,
};

export default System;
