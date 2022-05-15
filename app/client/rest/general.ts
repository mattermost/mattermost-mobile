// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import ClientError from './error';

export interface ClientGeneralMix {
    getOpenGraphMetadata: (url: string) => Promise<any>;
    ping: (deviceId?: string, timeoutInterval?: number) => Promise<any>;
    logClientError: (message: string, level?: string) => Promise<any>;
    getClientConfigOld: () => Promise<ClientConfig>;
    getClientLicenseOld: () => Promise<ClientLicense>;
    getTimezones: () => Promise<string[]>;
    getDataRetentionPolicy: () => Promise<any>;
    getRolesByNames: (rolesNames: string[]) => Promise<Role[]>;
    getRedirectLocation: (urlParam: string) => Promise<Record<string, string>>;
}

const ClientGeneral = (superclass: any) => class extends superclass {
    getOpenGraphMetadata = async (url: string) => {
        return this.doFetch(
            `${this.urlVersion}/opengraph`,
            {method: 'post', body: {url}},
        );
    };

    ping = async (deviceId?: string, timeoutInterval?: number) => {
        let url = `${this.urlVersion}/system/ping?time=${Date.now()}`;
        if (deviceId) {
            url = `${url}&device_id=${deviceId}`;
        }
        return this.doFetch(
            url,
            {method: 'get', timeoutInterval},
            false,
        );
    };

    logClientError = async (message: string, level = 'ERROR') => {
        const url = `${this.urlVersion}/logs`;

        if (!this.enableLogging) {
            throw new ClientError(this.client.baseUrl, {
                message: 'Logging disabled.',
                url,
            });
        }

        return this.doFetch(
            url,
            {method: 'post', body: {message, level}},
        );
    };

    getClientConfigOld = async () => {
        return this.doFetch(
            `${this.urlVersion}/config/client?format=old`,
            {method: 'get'},
        );
    };

    getClientLicenseOld = async () => {
        return this.doFetch(
            `${this.urlVersion}/license/client?format=old`,
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
            {method: 'post', body: rolesNames},
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
