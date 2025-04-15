// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientUsersMix {
    createUser: (user: UserProfile, token: string, inviteId: string) => Promise<UserProfile>;
    patchMe: (userPatch: Partial<UserProfile>, groupLabel?: RequestGroupLabel) => Promise<UserProfile>;
    patchUser: (userPatch: Partial<UserProfile> & {id: string}) => Promise<UserProfile>;
    updateUser: (user: UserProfile) => Promise<UserProfile>;
    demoteUserToGuest: (userId: string) => Promise<any>;
    getKnownUsers: () => Promise<string[]>;
    sendPasswordResetEmail: (email: string) => Promise<any>;
    setDefaultProfileImage: (userId: string) => Promise<any>;
    login: (loginId: string, password: string, token?: string, deviceId?: string, ldapOnly?: boolean) => Promise<UserProfile>;
    loginById: (id: string, password: string, token?: string, deviceId?: string) => Promise<UserProfile>;
    logout: () => Promise<any>;
    getProfiles: (page?: number, perPage?: number, options?: Record<string, any>) => Promise<UserProfile[]>;
    getProfilesByIds: (userIds: string[], options?: Record<string, any>, groupLabel?: RequestGroupLabel) => Promise<UserProfile[]>;
    getProfilesByUsernames: (usernames: string[], groupLabel?: RequestGroupLabel) => Promise<UserProfile[]>;
    getProfilesInTeam: (teamId: string, page?: number, perPage?: number, sort?: string, options?: Record<string, any>) => Promise<UserProfile[]>;
    getProfilesNotInTeam: (teamId: string, groupConstrained: boolean, page?: number, perPage?: number) => Promise<UserProfile[]>;
    getProfilesWithoutTeam: (page?: number, perPage?: number, options?: Record<string, any>) => Promise<UserProfile[]>;
    getProfilesInChannel: (channelId: string, options?: GetUsersOptions, groupLabel?: RequestGroupLabel) => Promise<UserProfile[]>;
    getProfilesInGroupChannels: (channelsIds: string[], groupLabel?: RequestGroupLabel) => Promise<{[x: string]: UserProfile[]}>;
    getProfilesNotInChannel: (teamId: string, channelId: string, groupConstrained: boolean, page?: number, perPage?: number) => Promise<UserProfile[]>;
    getMe: (groupLabel?: RequestGroupLabel) => Promise<UserProfile>;
    getUser: (userId: string) => Promise<UserProfile>;
    getUserByUsername: (username: string) => Promise<UserProfile>;
    getUserByEmail: (email: string) => Promise<UserProfile>;
    getProfilePictureUrl: (userId: string, lastPictureUpdate: number) => string;
    getDefaultProfilePictureUrl: (userId: string) => string;
    autocompleteUsers: (name: string, teamId: string, channelId?: string, options?: Record<string, any>) => Promise<{users: UserProfile[]; out_of_channel?: UserProfile[]}>;
    getSessions: (userId: string) => Promise<Session[]>;
    checkUserMfa: (loginId: string) => Promise<{mfa_required: boolean}>;
    setExtraSessionProps: (deviceId: string, notificationsEnabled: boolean, version: string | null, groupLabel?: RequestGroupLabel) => Promise<{}>;
    searchUsers: (term: string, options: SearchUserOptions) => Promise<UserProfile[]>;
    getStatusesByIds: (userIds: string[]) => Promise<UserStatus[]>;
    getStatus: (userId: string, groupLabel?: RequestGroupLabel) => Promise<UserStatus>;
    updateStatus: (status: UserStatus) => Promise<UserStatus>;
    updateCustomStatus: (customStatus: UserCustomStatus) => Promise<{status: string}>;
    unsetCustomStatus: () => Promise<{status: string}>;
    removeRecentCustomStatus: (customStatus: UserCustomStatus) => Promise<{status: string}>;
}

const ClientUsers = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createUser = async (user: UserProfile, token: string, inviteId: string) => {
        const queryParams: any = {};

        if (token) {
            queryParams.t = token;
        }

        if (inviteId) {
            queryParams.iid = inviteId;
        }

        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString(queryParams)}`,
            {method: 'post', body: user},
        );
    };

    patchMe = async (userPatch: Partial<UserProfile>, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/patch`,
            {method: 'put', body: userPatch, groupLabel},
        );
    };

    patchUser = async (userPatch: Partial<UserProfile> & {id: string}) => {
        return this.doFetch(
            `${this.getUserRoute(userPatch.id)}/patch`,
            {method: 'put', body: userPatch},
        );
    };

    updateUser = async (user: UserProfile) => {
        return this.doFetch(
            `${this.getUserRoute(user.id)}`,
            {method: 'put', body: user},
        );
    };

    demoteUserToGuest = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/demote`,
            {method: 'post'},
        );
    };

    getKnownUsers = async () => {
        return this.doFetch(
            `${this.getUsersRoute()}/known`,
            {method: 'get'},
        );
    };

    sendPasswordResetEmail = async (email: string) => {
        return this.doFetch(
            `${this.getUsersRoute()}/password/reset/send`,
            {method: 'post', body: {email}},
        );
    };

    setDefaultProfileImage = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/image`,
            {method: 'delete'},
        );
    };

    login = async (loginId: string, password: string, token = '', deviceId = '', ldapOnly = false) => {
        const body: any = {
            device_id: deviceId,
            login_id: loginId,
            password,
            token,
        };

        if (ldapOnly) {
            body.ldap_only = 'true';
        }

        const resp = await this.doFetch(
            `${this.getUsersRoute()}/login`,
            {
                method: 'post',
                body,
                headers: {'Cache-Control': 'no-store'},
            },
            false,
        );

        return resp?.data;
    };

    loginById = async (id: string, password: string, token = '', deviceId = '') => {
        const body: any = {
            device_id: deviceId,
            id,
            password,
            token,
        };

        const resp = await this.doFetch(
            `${this.getUsersRoute()}/login`,
            {
                method: 'post',
                body,
                headers: {'Cache-Control': 'no-store'},
            },
            false,
        );

        return resp?.data;
    };

    logout = async () => {
        const response = await this.doFetch(
            `${this.getUsersRoute()}/logout`,
            {method: 'post'},
        );

        return response;
    };

    getProfiles = async (page = 0, perPage = PER_PAGE_DEFAULT, options = {}) => {
        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString({page, per_page: perPage, ...options})}`,
            {method: 'get'},
        );
    };

    getProfilesByIds = async (userIds: string[], options = {}, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUsersRoute()}/ids${buildQueryString(options)}`,
            {method: 'post', body: userIds, groupLabel},
        );
    };

    getProfilesByUsernames = async (usernames: string[], groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUsersRoute()}/usernames`,
            {method: 'post', body: usernames, groupLabel},
        );
    };

    getProfilesInTeam = async (teamId: string, page = 0, perPage = PER_PAGE_DEFAULT, sort = '', options = {}) => {
        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString({...options, in_team: teamId, page, per_page: perPage, sort})}`,
            {method: 'get'},
        );
    };

    getProfilesNotInTeam = async (teamId: string, groupConstrained: boolean, page = 0, perPage = PER_PAGE_DEFAULT) => {
        const queryStringObj: any = {not_in_team: teamId, page, per_page: perPage};
        if (groupConstrained) {
            queryStringObj.group_constrained = true;
        }

        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString(queryStringObj)}`,
            {method: 'get'},
        );
    };

    getProfilesWithoutTeam = async (page = 0, perPage = PER_PAGE_DEFAULT, options = {}) => {
        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString({...options, without_team: 1, page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    getProfilesInChannel = async (channelId: string, options: GetUsersOptions, groupLabel?: RequestGroupLabel) => {
        const queryStringObj = {in_channel: channelId, ...options};
        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString(queryStringObj)}`,
            {method: 'get', groupLabel},
        );
    };

    getProfilesInGroupChannels = async (channelsIds: string[], groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUsersRoute()}/group_channels`,
            {method: 'post', body: channelsIds, groupLabel},
        );
    };

    getProfilesNotInChannel = async (teamId: string, channelId: string, groupConstrained: boolean, page = 0, perPage = PER_PAGE_DEFAULT) => {
        const queryStringObj: any = {in_team: teamId, not_in_channel: channelId, page, per_page: perPage};
        if (groupConstrained) {
            queryStringObj.group_constrained = true;
        }

        return this.doFetch(
            `${this.getUsersRoute()}${buildQueryString(queryStringObj)}`,
            {method: 'get'},
        );
    };

    getMe = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUserRoute('me')}`,
            {method: 'get', groupLabel},
        );
    };

    getUser = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}`,
            {method: 'get'},
        );
    };

    getCustomProfileAttributeFields = async () => {
        return this.doFetch(
            `${this.getCustomProfileAttributesRoute()}/fields`,
            {method: 'get'},
        );
    };

    getUserByUsername = async (username: string) => {
        return this.doFetch(
            `${this.getUsersRoute()}/username/${username}`,
            {method: 'get'},
        );
    };

    getUserByEmail = async (email: string) => {
        return this.doFetch(
            `${this.getUsersRoute()}/email/${email}`,
            {method: 'get'},
        );
    };

    getProfilePictureUrl = (userId: string, lastPictureUpdate: number) => {
        const params: any = {};

        if (lastPictureUpdate) {
            params._ = lastPictureUpdate;
        }

        return `${this.getUserRoute(userId)}/image${buildQueryString(params)}`;
    };

    getDefaultProfilePictureUrl = (userId: string) => {
        return `${this.getUserRoute(userId)}/image/default`;
    };

    autocompleteUsers = async (name: string, teamId: string, channelId?: string, options = {
        limit: General.AUTOCOMPLETE_LIMIT_DEFAULT,
    }) => {
        const query: Dictionary<any> = {
            in_team: teamId,
            name,
        };
        if (channelId) {
            query.in_channel = channelId;
        }
        if (options.limit) {
            query.limit = options.limit;
        }
        return this.doFetch(`${this.getUsersRoute()}/autocomplete${buildQueryString(query)}`, {
            method: 'get',
        });
    };

    getSessions = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/sessions`,
            {
                method: 'get',
                headers: {'Cache-Control': 'no-store'},
            },
        );
    };

    checkUserMfa = async (loginId: string) => {
        return this.doFetch(
            `${this.getUsersRoute()}/mfa`,
            {
                method: 'post',
                body: {login_id: loginId},
                headers: {'Cache-Control': 'no-store'},
            },
        );
    };

    setExtraSessionProps = async (deviceId: string, deviceNotificationDisabled: boolean, version: string | null, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUsersRoute()}/sessions/device`,
            {
                method: 'put',
                body: {
                    device_id: deviceId,
                    device_notification_disabled: deviceNotificationDisabled ? 'true' : 'false',
                    mobile_version: version || '',
                },
                groupLabel,
            },
        );
    };

    searchUsers = async (term: string, options: any) => {
        return this.doFetch(
            `${this.getUsersRoute()}/search`,
            {method: 'post', body: {term, ...options}},
        );
    };

    getStatusesByIds = async (userIds: string[]) => {
        return this.doFetch(
            `${this.getUsersRoute()}/status/ids`,
            {method: 'post', body: userIds},
        );
    };

    getStatus = async (userId: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/status`,
            {method: 'get', groupLabel},
        );
    };

    updateStatus = async (status: UserStatus) => {
        return this.doFetch(
            `${this.getUserRoute(status.user_id)}/status`,
            {method: 'put', body: status},
        );
    };

    updateCustomStatus = async (customStatus: UserCustomStatus) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/status/custom`,
            {method: 'put', body: customStatus},
        );
    };

    unsetCustomStatus = async () => {
        return this.doFetch(
            `${this.getUserRoute('me')}/status/custom`,
            {method: 'delete'},
        );
    };

    removeRecentCustomStatus = async (customStatus: UserCustomStatus) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/status/custom/recent/delete`,
            {method: 'post', body: customStatus},
        );
    };
};

export default ClientUsers;
