// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'isomorphic-fetch';

const HEADER_AUTH = 'Authorization';
const HEADER_BEARER = 'BEARER';
const HEADER_REQUESTED_WITH = 'X-Requested-With';

export class Client {
    constructor() {
        this.teamId = '';
        this.serverVersion = ''; // ??
        this.logToConsole = false;
        this.token = '';
        this.url = '';
        this.urlVersion = '/api/v3';

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

    getOptions(options) {
        return {
            headers: {
                [HEADER_AUTH]: this.token,
                [HEADER_REQUESTED_WITH]: 'XMLHttpRequest'
            },
            ...options
        };
    }

    // General routes

    getClientConfig = (onRequest, onSuccess, onFailure) => {
        return this.doFetch(
            `${this.getGeneralRoute()}/client_props`,
            {method: 'get'},
            onRequest,
            onSuccess,
            onFailure
        );
    }

    getPing = (onRequest, onSuccess, onFailure) => {
        return this.doFetch(
            `${this.getGeneralRoute()}/ping`,
            {method: 'get'},
            onRequest,
            onSuccess,
            onFailure
        );
    }

    logClientError = (onRequest, onSuccess, onFailure, message, level = 'ERROR') => {
        const body = {
            message,
            level
        };

        return this.doFetch(
            `${this.getGeneralRoute()}/log_client_error`,
            {method: 'post', body},
            onRequest,
            onSuccess,
            onFailure
        );
    }

    // User routes

    // login(onRequest, onSuccess, onFailure, loginId, password, token) {
    //     const body = {
    //         login_id: loginId,
    //         password,
    //         token
    //     };

    //     return this.doFetch(
    //         `${this.getUsersRoute()}/login`,
    //         {method: 'post', body},
    //         onRequest,
    //         (data, response) => {
    //             console.log(response.headers);
    //             // if (response.headers.)

    //             onSuccess(data, response);
    //         },
    //         onFailure
    //     );
    // }

    // getInitialLoad(success, error) {
    //     request.
    //         get(`${this.getUsersRoute()}/initial_load`).
    //         set(this.defaultHeaders).
    //         type('application/json').
    //         accept('application/json').
    //         end(this.handleResponse.bind(this, 'getInitialLoad', success, error));
    // }

    doFetch = (url, options, onRequest, onSuccess, onFailure) => {
        return () => {
            onRequest();

            return fetch(url, this.getOptions(options)).then(
                (response) => {
                    return response.json().then((data) => ({data, response}));
                }).then(({data, response}) => {
                    if (!response.ok) {
                        return Promise.reject(data);
                    }

                    return onSuccess(data, response);
                }).catch((err) => {
                    if (this.logToConsole) {
                        console.log(err); // eslint-disable-line no-console
                    }

                    onFailure(err);
                }
            );
        };
    }
}

export default new Client();
