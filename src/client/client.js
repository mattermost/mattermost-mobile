// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const HEADER_AUTH = 'Authorization';
const HEADER_BEARER = 'BEARER';
const HEADER_CONTENT_TYPE = 'Content-Type';
const HEADER_REQUESTED_WITH = 'X-Requested-With';
const HEADER_TOKEN = 'token';

const CONTENT_TYPE_JSON = 'application/json';

export default class Client {
    constructor() {
        this.teamId = '';
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

    setTeamId(id) {
        this.teamId = id;
    }

    getTeamId() {
        if (!this.teamId) {
            console.error('You are trying to use a route that requires a team_id, but you have not called setTeamId() in client.jsx'); // eslint-disable-line no-console
        }

        return this.teamId;
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

    enableLogErrorsToConsole(enabled) {
        this.logToConsole = enabled;
    }

    getOptions(options) {
        const headers = {
            [HEADER_REQUESTED_WITH]: 'XMLHttpRequest'
        };

        if (this.token) {
            headers[HEADER_AUTH] = `${HEADER_BEARER} ${this.token}`;
        }

        return {
            headers,
            ...options
        };
    }

    // General routes

    getClientConfig = async () => {
        return this.doFetch(
            `${this.getGeneralRoute()}/client_props`,
            {method: 'get'}
        );
    }

    getPing = async () => {
        return this.doFetch(
            `${this.getGeneralRoute()}/ping`,
            {method: 'get'}
        );
    }

    logClientError = async (message, level = 'ERROR') => {
        const body = {
            message,
            level
        };

        return this.doFetch(
            `${this.getGeneralRoute()}/log_client`,
            {method: 'post', body}
        );
    }

    // User routes

    createUser = async (user) => {
        return this.doFetch(
            `${this.getUsersRoute()}/create`,
            {method: 'post', body: JSON.stringify(user)}
        );
    }

    login = async (loginId, password, token = '') => {
        const body = {
            login_id: loginId,
            password,
            token
        };

        const {response, data} = await this.doFetchWithResponse(
            `${this.getUsersRoute()}/login`,
            {method: 'post', body: JSON.stringify(body)}
        );

        if (response.headers.has(HEADER_TOKEN)) {
            this.token = response.headers.get(HEADER_TOKEN);
        }

        return data;
    }

    logout = async () => {
        const {response} = await this.doFetchWithResponse(
            `${this.getUsersRoute()}/logout`,
            {method: 'post'}
        );
        if (response.ok) {
            this.token = '';
        }
        return response;
    }

    getInitialLoad = async () => {
        return this.doFetch(
            `${this.getUsersRoute()}/initial_load`,
            {method: 'get'}
        );
    }

    // Team routes

    createTeam = async (team) => {
        return this.doFetch(
            `${this.getTeamsRoute()}/create`,
            {method: 'post', body: JSON.stringify(team)}
        );
    }

    fetchTeams = async () => {
        return this.doFetch(
            `${this.getTeamsRoute()}/all_team_listings`,
            {method: 'get'}
        );
    }

    // Channel routes

    createChannel = async (channel) => {
        return this.doFetch(
            `${this.getChannelsRoute()}/create`,
            {method: 'post', body: JSON.stringify(channel)}
        );
    }

    fetchChannels = async () => {
        return this.doFetch(
            `${this.getChannelsRoute()}/`,
            {method: 'get'}
        );
    }

    // Post routes
    fetchPosts = (channelId, onRequest, onSuccess, onFailure) => {
        return this.doFetch(
            `${this.getPostsRoute(channelId)}/page/0/60`,
            {method: 'get'},
            onRequest,
            onSuccess,
            onFailure
        );
    }

    createPost = async (post) => {
        return this.doFetch(
            `${this.getPostsRoute(post.channel_id)}/create`,
            {method: 'post', body: JSON.stringify(post)}
        );
    }

    doFetch = async (url, options) => {
        const {data} = await this.doFetchWithResponse(url, options);

        return data;
    }

    doFetchWithResponse = async (url, options) => {
        const response = await fetch(url, this.getOptions(options));

        const contentType = response.headers.get(HEADER_CONTENT_TYPE);
        const isJson = contentType && contentType.indexOf(CONTENT_TYPE_JSON) !== -1;

        let data;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.ok) {
            return {
                response,
                data
            };
        }

        let msg;
        if (isJson) {
            msg = data.message || '';
        } else {
            msg = data;
        }

        if (this.logToConsole) {
            console.error(msg); // eslint-disable-line no-console
        }

        throw new Error(msg);
    }
}
