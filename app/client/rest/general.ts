// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config} from '@mm-redux/types/config';
import {Role} from '@mm-redux/types/roles';
import {Dictionary} from '@mm-redux/types/utilities';
import {buildQueryString} from '@mm-redux/utils/helpers';

import ClientError from './error';

export interface ClientGeneralMix {
    getOpenGraphMetadata: (url: string) => Promise<any>;
    ping: () => Promise<any>;
    logClientError: (message: string, level?: string) => Promise<any>;
    getClientConfigOld: () => Promise<Config>;
    getClientLicenseOld: () => Promise<any>;
    getTimezones: () => Promise<string[]>;
    getDataRetentionPolicy: () => Promise<any>;
    getRolesByNames: (rolesNames: string[]) => Promise<Role[]>;
    getRedirectLocation: (urlParam: string) => Promise<Dictionary<string>>;
}

const ClientGeneral = (superclass: any) => class extends superclass {
    getOpenGraphMetadata = async (url: string) => {
        return this.doFetch(
            `${this.getBaseRoute()}/opengraph`,
            {method: 'post', body: JSON.stringify({url})},
        );
    };

    ping = async () => {
        return this.doFetch(
            `${this.getBaseRoute()}/system/ping?time=${Date.now()}`,
            {method: 'get'},
        );
    };

    logClientError = async (message: string, level = 'ERROR') => {
        const url = `${this.getBaseRoute()}/logs`;

        if (!this.enableLogging) {
            throw new ClientError(this.getUrl(), {
                message: 'Logging disabled.',
                url,
            });
        }

        return this.doFetch(
            url,
            {method: 'post', body: JSON.stringify({message, level})},
        );
    };

    getClientConfigOld = async () => {
        return this.doFetch(
            `${this.getBaseRoute()}/config/client?format=old`,
            {method: 'get'},
        );
    };

    getClientLicenseOld = async () => {
        return this.doFetch(
            `${this.getBaseRoute()}/license/client?format=old`,
            {method: 'get'},
        );
    };

    getTimezones = async () => {
        return this.doFetch(
            `${this.getTimezonesRoute()}`,
            {method: 'get'},
        );
    };

    getDataRetentionPolicy = () => {
        return this.doFetch(
            `${this.getDataRetentionRoute()}/policy`,
            {method: 'get'},
        );
    };

    getRolesByNames = async (rolesNames: string[]) => {
        return this.doFetch(
            `${this.getRolesRoute()}/names`,
            {method: 'post', body: JSON.stringify(rolesNames)},
        );
    };

    getRedirectLocation = async (urlParam: string) => {
        if (!urlParam.length) {
            return Promise.resolve();
        }
        const url = `${this.getRedirectLocationRoute()}${buildQueryString({url: urlParam})}`;
        return this.doFetch(url, {method: 'get'});
    };
};

export default ClientGeneral;
