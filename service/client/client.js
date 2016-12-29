// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const HEADER_AUTH = 'Authorization';
const HEADER_BEARER = 'BEARER';
const HEADER_CONTENT_TYPE = 'Content-Type';
const HEADER_REQUESTED_WITH = 'X-Requested-With';
const HEADER_TOKEN = 'Token';

const CONTENT_TYPE_JSON = 'application/json';

export default class Client {
    constructor() {
        this.logToConsole = false;
        this.token = '';
        this.url = '';
        this.urlVersion = '/api/v3';

        this.translations = {
            connectionError: 'There appears to be a problem with your internet connection.',
            unknownError: 'We received an unexpected status code from the server.'
        };
    }

    getUrl() {
        return this.url;
    }

    setUrl(url) {
        this.url = url;
    }

    getToken() {
        return this.token;
    }

    setToken(token) {
        this.token = token;
    }

    getUrlVersion() {
        return this.urlVersion;
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

    getPreferencesRoute() {
        return `${this.url}${this.urlVersion}/preferences`;
    }

    getTeamNeededRoute(teamId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}`;
    }

    getChannelsRoute(teamId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/channels`;
    }

    getChannelNameRoute(teamId, channelName) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/channels/name/${channelName}`;
    }

    getChannelNeededRoute(teamId, channelId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/channels/${channelId}`;
    }

    getCommandsRoute(teamId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/commands`;
    }

    getEmojiRoute() {
        return `${this.url}${this.urlVersion}/emoji`;
    }

    getHooksRoute(teamId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/hooks`;
    }

    getPostsRoute(teamId, channelId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/channels/${channelId}/posts`;
    }

    getUsersRoute() {
        return `${this.url}${this.urlVersion}/users`;
    }

    getFilesRoute(teamId) {
        return `${this.url}${this.urlVersion}/teams/${teamId}/files`;
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
    };

    getLicenseConfig = async () => {
        return this.doFetch(
            `${this.getLicenseRoute()}/client_config`,
            {method: 'get'}
        );
    };

    getPing = async () => {
        return this.doFetch(
            `${this.getGeneralRoute()}/ping`,
            {method: 'get'}
        );
    };

    logClientError = async (message, level = 'ERROR') => {
        const body = {
            message,
            level
        };

        return this.doFetch(
            `${this.getGeneralRoute()}/log_client`,
            {method: 'post', body}
        );
    };

    // User routes
    createUser = async (user) => {
        return this.createUserWithInvite(user);
    };

    // TODO: add deep linking to emails so we can create accounts from within
    // the mobile app
    createUserWithInvite = async(user, data, emailHash, inviteId) => {
        let url = `${this.getUsersRoute()}/create`;

        url += '?d=' + encodeURIComponent(data);

        if (emailHash) {
            url += '&h=' + encodeURIComponent(emailHash);
        }

        if (inviteId) {
            url += '&iid=' + encodeURIComponent(inviteId);
        }

        return this.doFetch(
            url,
            {method: 'post', body: JSON.stringify(user)}
        );
    };

    login = async (loginId, password, token = '') => {
        const body = {
            login_id: loginId,
            password,
            token
        };

        const {headers, data} = await this.doFetchWithResponse(
            `${this.getUsersRoute()}/login`,
            {method: 'post', body: JSON.stringify(body)}
        );

        if (headers.has(HEADER_TOKEN)) {
            this.token = headers.get(HEADER_TOKEN);
        }

        return data;
    };

    logout = async () => {
        const {response} = await this.doFetchWithResponse(
            `${this.getUsersRoute()}/logout`,
            {method: 'post'}
        );
        if (response.ok) {
            this.token = '';
        }
        return response;
    };

    updateUser = async (user) => {
        return this.doFetch(
            `${this.getUsersRoute()}/update`,
            {method: 'post', body: JSON.stringify(user)}
        );
    };

    updatePassword = async (userId, currentPassword, newPassword) => {
        const data = {
            user_id: userId,
            current_password: currentPassword,
            new_password: newPassword
        };

        return this.doFetch(
            `${this.getUsersRoute()}/newpassword`,
            {method: 'post', body: JSON.stringify(data)}
        );
    };

    updateUserNotifyProps = async (notifyProps) => {
        return this.doFetch(
            `${this.getUsersRoute()}/update_notify`,
            {method: 'post', body: JSON.stringify(notifyProps)}
        );
    };

    updateUserRoles = async (userId, newRoles) => {
        return this.doFetch(
            `${this.getUserNeededRoute(userId)}/update_roles`,
            {method: 'post', body: JSON.stringify({new_roles: newRoles})}
        );
    };

    getMe = async () => {
        return this.doFetch(
            `${this.getUsersRoute()}/me`,
            {method: 'get'}
        );
    };

    getProfiles = async (offset, limit) => {
        return this.doFetch(
            `${this.getUsersRoute()}/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getProfilesByIds = async (userIds) => {
        return this.doFetch(
            `${this.getUsersRoute()}/ids`,
            {method: 'post', body: JSON.stringify(userIds)}
        );
    };

    getProfilesInTeam = async (teamId, offset, limit) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/users/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getProfilesInChannel = async (teamId, channelId, offset, limit) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/users/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getProfilesNotInChannel = async (teamId, channelId, offset, limit) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/users/not_in_channel/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getUser = async (userId) => {
        return this.doFetch(
            `${this.getUserNeededRoute(userId)}/get`,
            {method: 'get'}
        );
    };

    getStatusesByIds = async (userIds) => {
        return this.doFetch(
            `${this.getUsersRoute()}/status/ids`,
            {method: 'post', body: JSON.stringify(userIds)}
        );
    };

    getSessions = async (userId) => {
        return this.doFetch(
            `${this.getUserNeededRoute(userId)}/sessions`,
            {method: 'get'}
        );
    };

    revokeSession = async (id) => {
        return this.doFetch(
            `${this.getUsersRoute()}/revoke_session`,
            {method: 'post', body: JSON.stringify({id})}
        );
    };

    getAudits = async (userId) => {
        return this.doFetch(
            `${this.getUserNeededRoute(userId)}/audits`,
            {method: 'get'}
        );
    };

    // Team routes

    createTeam = async (team) => {
        return this.doFetch(
            `${this.getTeamsRoute()}/create`,
            {method: 'post', body: JSON.stringify(team)}
        );
    };

    updateTeam = async (team) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(team.id)}/update`,
            {method: 'post', body: JSON.stringify(team)}
        );
    };

    getAllTeams = async () => {
        return this.doFetch(
            `${this.getTeamsRoute()}/all`,
            {method: 'get'}
        );
    };

    getMyTeamMembers = async () => {
        return this.doFetch(
            `${this.getTeamsRoute()}/members`,
            {method: 'get'}
        );
    };

    getAllTeamListings = async () => {
        return this.doFetch(
            `${this.getTeamsRoute()}/all_team_listings`,
            {method: 'get'}
        );
    };

    getTeamMember = async (teamId, userId) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/members/${userId}`,
            {method: 'get'}
        );
    };

    getTeamMemberByIds = async (teamId, userIds) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/members/ids`,
            {method: 'post', body: JSON.stringify(userIds)}
        );
    };

    getTeamStats = async (teamId) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/stats`,
            {method: 'get'}
        );
    };

    addUserToTeam = async (teamId, userId) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/add_user_to_team`,
            {method: 'post', body: JSON.stringify({user_id: userId})}
        );
    };

    removeUserFromTeam = async (teamId, userId) => {
        return this.doFetch(
            `${this.getTeamNeededRoute(teamId)}/remove_user_from_team`,
            {method: 'post', body: JSON.stringify({user_id: userId})}
        );
    };

    // Channel routes

    createChannel = async (channel) => {
        return this.doFetch(
            `${this.getChannelsRoute(channel.team_id)}/create`,
            {method: 'post', body: JSON.stringify(channel)}
        );
    };

    createDirectChannel = async (teamId, userId) => {
        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/create_direct`,
            {method: 'post', body: JSON.stringify({user_id: userId})}
        );
    };

    getChannel = async (teamId, channelId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/`,
            {method: 'get'}
        );
    };

    getChannels = async (teamId) => {
        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/`,
            {method: 'get'}
        );
    };

    getMyChannelMembers = async (teamId) => {
        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/members`,
            {method: 'get'}
        );
    };

    updateChannel = async (channel) => {
        return this.doFetch(
            `${this.getChannelsRoute(channel.team_id)}/update`,
            {method: 'post', body: JSON.stringify(channel)}
        );
    };

    updateChannelNotifyProps = async (teamId, data) => {
        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/update_notify_props`,
            {method: 'post', body: JSON.stringify(data)}
        );
    };

    leaveChannel = async (teamId, channelId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/leave`,
            {method: 'post'}
        );
    };

    joinChannel = async (teamId, channelId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/join`,
            {method: 'post'}
        );
    };

    joinChannelByName = async (teamId, channelName) => {
        return this.doFetch(
            `${this.getChannelNameRoute(teamId, channelName)}/join`,
            {method: 'post'}
        );
    };

    deleteChannel = async (teamId, channelId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/delete`,
            {method: 'post'}
        );
    };

    viewChannel = async (teamId, channelId, prevChannelId = '') => {
        const data = {
            channel_id: channelId,
            prev_channel_id: prevChannelId
        };

        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/view`,
            {method: 'post', body: JSON.stringify(data)}
        );
    };

    getMoreChannels = async (teamId, offset, limit) => {
        return this.doFetch(
            `${this.getChannelsRoute(teamId)}/more/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getChannelStats = async (teamId, channelId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/stats`,
            {method: 'get'}
        );
    };

    addChannelMember = async (teamId, channelId, userId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/add`,
            {method: 'post', body: JSON.stringify({user_id: userId})}
        );
    };

    removeChannelMember = async (teamId, channelId, userId) => {
        return this.doFetch(
            `${this.getChannelNeededRoute(teamId, channelId)}/remove`,
            {method: 'post', body: JSON.stringify({user_id: userId})}
        );
    };

    // Post routes
    createPost = async (teamId, post) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, post.channel_id)}/create`,
            {method: 'post', body: JSON.stringify(post)}
        );
    };

    editPost = async (teamId, post) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, post.channel_id)}/update`,
            {method: 'post', body: JSON.stringify(post)}
        );
    };

    deletePost = async (teamId, channelId, postId) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/${postId}/delete`,
            {method: 'post'}
        );
    };

    getPost = async (teamId, channelId, postId) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/${postId}/get`,
            {method: 'get'}
        );
    };

    getPosts = async (teamId, channelId, offset, limit) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/page/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getPostsSince = async (teamId, channelId, since) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/since/${since}`,
            {method: 'get'}
        );
    };

    getPostsBefore = async (teamId, channelId, postId, offset, limit) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/${postId}/before/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    getPostsAfter = async (teamId, channelId, postId, offset, limit) => {
        return this.doFetch(
            `${this.getPostsRoute(teamId, channelId)}/${postId}/after/${offset}/${limit}`,
            {method: 'get'}
        );
    };

    // Preferences routes
    getMyPreferences = async () => {
        return this.doFetch(
            `${this.getPreferencesRoute()}/`,
            {method: 'get'}
        );
    };

    savePreferences = async (preferences) => {
        return this.doFetch(
            `${this.getPreferencesRoute()}/save`,
            {method: 'post', body: JSON.stringify(preferences)}
        );
    };

    deletePreferences = async (preferences) => {
        return this.doFetch(
            `${this.getPreferencesRoute()}/delete`,
            {method: 'post', body: JSON.stringify(preferences)}
        );
    };

    getPreferenceCategory = async (category) => {
        return this.doFetch(
            `${this.getPreferencesRoute()}/${category}`,
            {method: 'get'}
        );
    };

    getPreference = async (category, name) => {
        return this.doFetch(
            `${this.getPreferencesRoute()}/${category}/${name}`,
            {method: 'get'}
        );
    };

    // Client helpers
    doFetch = async (url, options) => {
        const {data} = await this.doFetchWithResponse(url, options);

        return data;
    };

    doFetchWithResponse = async (url, options) => {
        const response = await fetch(url, this.getOptions(options));

        const headers = parseAndMergeNestedHeaders(response.headers);
        const contentType = headers.get(HEADER_CONTENT_TYPE);
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
                headers,
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

        throw {message: msg, status_code: data.status_code, url};
    };
}

function parseAndMergeNestedHeaders(originalHeaders) {
    // TODO: This is a workaround for https://github.com/matthew-andrews/isomorphic-fetch/issues/97
    // The real solution is to set Access-Control-Expose-Headers on the server
    const headers = new Map();
    let nestedHeaders = new Map();
    originalHeaders.forEach((val, key) => {
        const capitalizedKey = key.replace(/\b[a-z]/g, (l) => l.toUpperCase());
        let realVal = val;
        if (val && val.match(/\n\S+:\s\S+/)) {
            const nestedHeaderStrings = val.split('\n');
            realVal = nestedHeaderStrings.shift();
            const moreNestedHeaders = new Map(
                nestedHeaderStrings.map((h) => h.split(/:\s/))
            );
            nestedHeaders = new Map([...nestedHeaders, ...moreNestedHeaders]);
        }
        headers.set(capitalizedKey, realVal);
    });
    return new Map([...headers, ...nestedHeaders]);
}
