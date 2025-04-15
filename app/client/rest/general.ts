// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';
import ClientError from './error';

import type ClientBase from './base';

type PoliciesResponse<T> = {
    policies: T[];
    total_count: number;
}

export interface ClientGeneralMix {
    ping: (deviceId?: string, timeoutInterval?: number, groupLabel?: RequestGroupLabel) => Promise<any>;
    logClientError: (message: string, level?: string) => Promise<any>;
    getClientConfigOld: (groupLabel?: RequestGroupLabel) => Promise<ClientConfig>;
    getClientLicenseOld: (groupLabel?: RequestGroupLabel) => Promise<ClientLicense>;
    getLicenseLoadMetric: () => Promise<{load: number}>;
    getTimezones: () => Promise<string[]>;
    getGlobalDataRetentionPolicy: (groupLabel?: RequestGroupLabel) => Promise<GlobalDataRetentionPolicy>;
    getTeamDataRetentionPolicies: (userId: string, page?: number, perPage?: number, groupLabel?: RequestGroupLabel) => Promise<PoliciesResponse<TeamDataRetentionPolicy>>;
    getChannelDataRetentionPolicies: (userId: string, page?: number, perPage?: number, groupLabel?: RequestGroupLabel) => Promise<PoliciesResponse<ChannelDataRetentionPolicy>>;
    getRolesByNames: (rolesNames: string[], groupLabel?: RequestGroupLabel) => Promise<Role[]>;
    getRedirectLocation: (urlParam: string) => Promise<Record<string, string>>;
    sendPerformanceReport: (batch: PerformanceReport) => Promise<{}>;
}

const ClientGeneral = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    ping = async (deviceId?: string, timeoutInterval?: number, groupLabel?: RequestGroupLabel) => {
        let url = `${this.urlVersion}/system/ping?time=${Date.now()}`;
        if (deviceId) {
            url = `${url}&device_id=${deviceId}`;
        }
        return this.doFetch(
            url,
            {method: 'get', timeoutInterval, groupLabel},
            false,
        );
    };

    logClientError = async (message: string, level = 'ERROR') => {
        const url = `${this.urlVersion}/logs`;

        if (!this.enableLogging) {
            throw new ClientError(this.apiClient.baseUrl, {
                message: 'Logging disabled.',
                url,
            });
        }

        return this.doFetch(
            url,
            {method: 'post', body: {message, level}},
        );
    };

    getClientConfigOld = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.urlVersion}/config/client?format=old`,
            {method: 'get', groupLabel},
        );
    };

    getClientLicenseOld = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.urlVersion}/license/client?format=old`,
            {method: 'get', groupLabel},
        );
    };

    getLicenseLoadMetric = async () => {
        return this.doFetch(
            `${this.urlVersion}/license/load_metric`,
            {method: 'get'},
        );
    };

    getTimezones = async () => {
        return this.doFetch(
            `${this.getTimezonesRoute()}`,
            {method: 'get'},
        );
    };

    getGlobalDataRetentionPolicy = (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getGlobalDataRetentionRoute()}/policy`,
            {method: 'get', groupLabel},
        );
    };

    getTeamDataRetentionPolicies = (userId: string, page = 0, perPage = PER_PAGE_DEFAULT, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getGranularDataRetentionRoute(userId)}/team_policies${buildQueryString({page, per_page: perPage})}`,
            {method: 'get', groupLabel},
        );
    };

    getChannelDataRetentionPolicies = (userId: string, page = 0, perPage = PER_PAGE_DEFAULT, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getGranularDataRetentionRoute(userId)}/channel_policies${buildQueryString({page, per_page: perPage})}`,
            {method: 'get', groupLabel},
        );
    };

    getRolesByNames = async (rolesNames: string[], groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getRolesRoute()}/names`,
            {method: 'post', body: rolesNames, groupLabel},
        );
    };

    getRedirectLocation = async (urlParam: string) => {
        if (!urlParam.length) {
            return Promise.resolve();
        }
        const url = `${this.getRedirectLocationRoute()}${buildQueryString({url: urlParam})}`;
        return this.doFetch(url, {method: 'get'});
    };

    sendPerformanceReport = async (report: PerformanceReport) => {
        return this.doFetch(
            this.getPerformanceRoute(),
            {method: 'post', body: report},
        );
    };
};

export default ClientGeneral;
