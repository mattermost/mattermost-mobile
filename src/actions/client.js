// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// import {Client} from 'mattermost';
// const client = new Client();
// client.useHeaderToken();
// client.setUrl('https://pre-release.mattermost.com');

if (typeof process !== 'undefined') {
    var fetch = require('node-fetch');
}

import {requestData, requestSuccess, requestFailure} from './helpers';

export const HEADER_X_VERSION_ID = 'x-version-id';
export const HEADER_X_CLUSTER_ID = 'x-cluster-id';
export const HEADER_TOKEN = 'token';
export const HEADER_BEARER = 'BEARER';
export const HEADER_AUTH = 'Authorization';

export class ClientClass {
    constructor() {
        this.teamId = '';
        this.serverVersion = '';
        this.clusterId = '';
        this.logToConsole = false;
        this.useToken = false;
        this.token = '';
        this.url = '';
        this.urlVersion = '/api/v3';
        this.defaultHeaders = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        this.translations = {
            connectionError: 'There appears to be a problem with your internet connection.',
            unknownError: 'We received an unexpected status code from the server.'
        };
    }

    setUrl(url) {
        this.url = url;
    }

    setAcceptLanguage(locale) {
        this.defaultHeaders['Accept-Language'] = locale;
    }

    setTeamId(id) {
        this.teamId = id;
    }

    getTeamId() {
        if (!this.teamId) {
            console.error('You are trying to use a route that requires a team_id, but you have not called setTeamId() in client.jsx'); // eslint-disable-line no-console
        }

        return this.teamId;
    }

    getServerVersion() {
        return this.serverVersion;
    }

    getBaseRoute() {
        return `${this.url}${this.urlVersion}`;
    }

    getAdminRoute() {
        return `${this.url}${this.urlVersion}/admin`;
    }

    getGeneralRoute() {
        return `${this.url}${this.urlVersion}/general`;
    }

    getLicenseRoute() {
        return `${this.url}${this.urlVersion}/license`;
    }

    getTeamsRoute() {
        return `${this.url}${this.urlVersion}/teams`;
    }

    getTeamNeededRoute() {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}`;
    }

    getChannelsRoute() {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/channels`;
    }

    getChannelNameRoute(channelName) {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/channels/name/${channelName}`;
    }

    getChannelNeededRoute(channelId) {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/channels/${channelId}`;
    }

    getCommandsRoute() {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/commands`;
    }

    getEmojiRoute() {
        return `${this.url}${this.urlVersion}/emoji`;
    }

    getHooksRoute() {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/hooks`;
    }

    getPostsRoute(channelId) {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/channels/${channelId}/posts`;
    }

    getUsersRoute() {
        return `${this.url}${this.urlVersion}/users`;
    }

    getFilesRoute() {
        return `${this.url}${this.urlVersion}/teams/${this.getTeamId()}/files`;
    }

    getOAuthRoute() {
        return `${this.url}${this.urlVersion}/oauth`;
    }

    getUserNeededRoute(userId) {
        return `${this.url}${this.urlVersion}/users/${userId}`;
    }

    setTranslations(messages) {
        this.translations = messages;
    }

    enableLogErrorsToConsole(enabled) {
        this.logToConsole = enabled;
    }

    useHeaderToken() {
        this.useToken = true;
        if (this.token !== '') {
            this.defaultHeaders[HEADER_AUTH] = `${HEADER_BEARER} ${this.token}`;
        }
    }

    doFetch(REQUEST, SUCCESS, FAILURE, url) {
        return (dispatch) => {
            dispatch(requestData(REQUEST));

            return fetch(url).then(
                (response) => {
                    return response.json().then((json) => ({json, response}));
                }).then(({json, response}) => {
                    if (!response.ok) {
                        return Promise.reject(json);
                    }

                    return dispatch(requestSuccess(SUCCESS, json));
                }).catch((err) => {
                    if (this.logToConsole) {
                        console.log(err); // eslint-disable-line no-console
                    }

                    dispatch(requestFailure(FAILURE, err));
                });
        };
    }
}

const client = new ClientClass();
export default client;
