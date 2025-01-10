// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientUsersMix} from './users';

describe('ClientUsers', () => {
    let client: ClientUsersMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('createUser', async () => {
        const user = {id: 'user1', username: 'testuser'} as UserProfile;
        const token = 'token';
        const inviteId = 'inviteId';
        const expectedUrl = `${client.getUsersRoute()}?t=${token}&iid=${inviteId}`;
        const expectedOptions = {method: 'post', body: user};

        await client.createUser(user, token, inviteId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        await client.createUser(user, '', '');
        expect(client.doFetch).toHaveBeenCalledWith(client.getUsersRoute(), expectedOptions);
    });

    test('patchMe', async () => {
        const userPatch = {username: 'newusername'};
        const expectedUrl = `${client.getUserRoute('me')}/patch`;
        const expectedOptions = {method: 'put', body: userPatch};

        await client.patchMe(userPatch);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('patchUser', async () => {
        const userPatch = {id: 'user1', username: 'newusername'};
        const expectedUrl = `${client.getUserRoute(userPatch.id)}/patch`;
        const expectedOptions = {method: 'put', body: userPatch};

        await client.patchUser(userPatch);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateUser', async () => {
        const user = {id: 'user1', username: 'updateduser'} as UserProfile;
        const expectedUrl = client.getUserRoute(user.id);
        const expectedOptions = {method: 'put', body: user};

        await client.updateUser(user);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('demoteUserToGuest', async () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/demote`;
        const expectedOptions = {method: 'post'};

        await client.demoteUserToGuest(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getKnownUsers', async () => {
        const expectedUrl = `${client.getUsersRoute()}/known`;
        const expectedOptions = {method: 'get'};

        await client.getKnownUsers();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('sendPasswordResetEmail', async () => {
        const email = 'test@example.com';
        const expectedUrl = `${client.getUsersRoute()}/password/reset/send`;
        const expectedOptions = {method: 'post', body: {email}};

        await client.sendPasswordResetEmail(email);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('setDefaultProfileImage', async () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/image`;
        const expectedOptions = {method: 'delete'};

        await client.setDefaultProfileImage(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('login', async () => {
        const loginId = 'testuser';
        const password = 'password';
        const token = 'token';
        const deviceId = 'deviceId';
        const ldapOnly = true;
        const expectedUrl = `${client.getUsersRoute()}/login`;
        const expectedOptions = {
            method: 'post',
            body: {
                device_id: deviceId,
                login_id: loginId,
                password,
                token,
                ldap_only: 'true',
            },
            headers: {'Cache-Control': 'no-store'},
        };

        await client.login(loginId, password, token, deviceId, ldapOnly);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions, false);

        // Test with default values
        const defaultExpectedOptions = {
            method: 'post',
            body: {
                device_id: '',
                login_id: loginId,
                password,
                token: '',
            },
            headers: {'Cache-Control': 'no-store'},
        };

        await client.login(loginId, password);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, defaultExpectedOptions, false);
    });

    test('loginById', async () => {
        const id = 'user1';
        const password = 'password';
        const token = 'token';
        const deviceId = 'deviceId';
        const expectedUrl = `${client.getUsersRoute()}/login`;
        const expectedOptions = {
            method: 'post',
            body: {
                device_id: deviceId,
                id,
                password,
                token,
            },
            headers: {'Cache-Control': 'no-store'},
        };

        await client.loginById(id, password, token, deviceId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions, false);

        // Test with default values
        const defaultExpectedOptions = {
            method: 'post',
            body: {
                device_id: '',
                id,
                password,
                token: '',
            },
            headers: {'Cache-Control': 'no-store'},
        };

        await client.loginById(id, password);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, defaultExpectedOptions, false);
    });

    test('logout', async () => {
        const expectedUrl = `${client.getUsersRoute()}/logout`;
        const expectedOptions = {method: 'post'};

        await client.logout();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfiles', async () => {
        const page = 1;
        const perPage = 10;
        const options = {active: true};
        const expectedUrl = `${client.getUsersRoute()}?page=${page}&per_page=${perPage}&active=true`;
        const expectedOptions = {method: 'get'};

        await client.getProfiles(page, perPage, options);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedUrl = `${client.getUsersRoute()}?page=0&per_page=${PER_PAGE_DEFAULT}`;
        await client.getProfiles();
        expect(client.doFetch).toHaveBeenCalledWith(defaultExpectedUrl, expectedOptions);
    });

    test('getProfilesByIds', async () => {
        const userIds = ['user1', 'user2'];
        const options = {active: true};
        const expectedUrl = `${client.getUsersRoute()}/ids?active=true`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.getProfilesByIds(userIds, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfilesByUsernames', async () => {
        const usernames = ['user1', 'user2'];
        const expectedUrl = `${client.getUsersRoute()}/usernames`;
        const expectedOptions = {method: 'post', body: usernames};

        await client.getProfilesByUsernames(usernames);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfilesInTeam', async () => {
        const teamId = 'team1';
        const page = 1;
        const perPage = 10;
        const sort = 'username';
        const options = {active: true};
        const expectedUrl = `${client.getUsersRoute()}?active=true&in_team=${teamId}&page=${page}&per_page=${perPage}&sort=${sort}`;
        const expectedOptions = {method: 'get'};

        await client.getProfilesInTeam(teamId, page, perPage, sort, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedUrl = `${client.getUsersRoute()}?in_team=${teamId}&page=0&per_page=${PER_PAGE_DEFAULT}&sort=`;
        await client.getProfilesInTeam(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(defaultExpectedUrl, expectedOptions);
    });

    test('getProfilesNotInTeam', async () => {
        const teamId = 'team1';
        const groupConstrained = true;
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getUsersRoute()}?not_in_team=${teamId}&page=${page}&per_page=${perPage}&group_constrained=true`;
        const expectedOptions = {method: 'get'};

        await client.getProfilesNotInTeam(teamId, groupConstrained, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedUrl = `${client.getUsersRoute()}?not_in_team=${teamId}&page=0&per_page=${PER_PAGE_DEFAULT}`;
        await client.getProfilesNotInTeam(teamId, false);
        expect(client.doFetch).toHaveBeenCalledWith(defaultExpectedUrl, expectedOptions);
    });

    test('getProfilesWithoutTeam', async () => {
        const page = 1;
        const perPage = 10;
        const options = {active: true};
        const expectedUrl = `${client.getUsersRoute()}?active=true&without_team=1&page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getProfilesWithoutTeam(page, perPage, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedUrl = `${client.getUsersRoute()}?without_team=1&page=0&per_page=${PER_PAGE_DEFAULT}`;
        await client.getProfilesWithoutTeam();
        expect(client.doFetch).toHaveBeenCalledWith(defaultExpectedUrl, expectedOptions);
    });

    test('getProfilesInChannel', async () => {
        const channelId = 'channel1';
        const options = {active: true};
        const expectedUrl = `${client.getUsersRoute()}?in_channel=${channelId}&active=true`;
        const expectedOptions = {method: 'get'};

        await client.getProfilesInChannel(channelId, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfilesInGroupChannels', async () => {
        const channelsIds = ['channel1', 'channel2'];
        const expectedUrl = `${client.getUsersRoute()}/group_channels`;
        const expectedOptions = {method: 'post', body: channelsIds};

        await client.getProfilesInGroupChannels(channelsIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfilesNotInChannel', async () => {
        const teamId = 'team1';
        const channelId = 'channel1';
        const groupConstrained = true;
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getUsersRoute()}?in_team=${teamId}&not_in_channel=${channelId}&page=${page}&per_page=${perPage}&group_constrained=true`;
        const expectedOptions = {method: 'get'};

        await client.getProfilesNotInChannel(teamId, channelId, groupConstrained, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedUrl = `${client.getUsersRoute()}?in_team=${teamId}&not_in_channel=${channelId}&page=0&per_page=${PER_PAGE_DEFAULT}`;
        await client.getProfilesNotInChannel(teamId, channelId, false);
        expect(client.doFetch).toHaveBeenCalledWith(defaultExpectedUrl, expectedOptions);
    });

    test('getMe', async () => {
        const expectedUrl = client.getUserRoute('me');
        const expectedOptions = {method: 'get'};

        await client.getMe();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getUser', async () => {
        const userId = 'user1';
        const expectedUrl = client.getUserRoute(userId);
        const expectedOptions = {method: 'get'};

        await client.getUser(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getUserByUsername', async () => {
        const username = 'testuser';
        const expectedUrl = `${client.getUsersRoute()}/username/${username}`;
        const expectedOptions = {method: 'get'};

        await client.getUserByUsername(username);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getUserByEmail', async () => {
        const email = 'test@example.com';
        const expectedUrl = `${client.getUsersRoute()}/email/${email}`;
        const expectedOptions = {method: 'get'};

        await client.getUserByEmail(email);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getProfilePictureUrl', () => {
        const userId = 'user1';

        // Test with non-zero lastPictureUpdate
        const lastPictureUpdate = 123456;
        let url = client.getProfilePictureUrl(userId, lastPictureUpdate);
        expect(url).toBe(`${client.getUserRoute(userId)}/image?_=${lastPictureUpdate}`);

        // Test with zero lastPictureUpdate
        url = client.getProfilePictureUrl(userId, 0);
        expect(url).toBe(`${client.getUserRoute(userId)}/image`);
    });

    test('getDefaultProfilePictureUrl', () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/image/default`;

        const result = client.getDefaultProfilePictureUrl(userId);

        expect(result).toBe(expectedUrl);
    });

    test('autocompleteUsers', async () => {
        const name = 'test';
        const teamId = 'team1';
        const channelId = 'channel1';
        const options = {limit: 10};
        const expectedUrl = `${client.getUsersRoute()}/autocomplete?in_team=${teamId}&name=${name}&in_channel=${channelId}&limit=${options.limit}`;
        const expectedOptions = {method: 'get'};

        await client.autocompleteUsers(name, teamId, channelId, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getSessions', async () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/sessions`;
        const expectedOptions = {method: 'get', headers: {'Cache-Control': 'no-store'}};

        await client.getSessions(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('checkUserMfa', async () => {
        const loginId = 'testuser';
        const expectedUrl = `${client.getUsersRoute()}/mfa`;
        const expectedOptions = {method: 'post', body: {login_id: loginId}, headers: {'Cache-Control': 'no-store'}};

        await client.checkUserMfa(loginId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('setExtraSessionProps', async () => {
        const deviceId = 'device1';
        const deviceNotificationDisabled = true;
        const version = '1.0.0';
        const expectedUrl = `${client.getUsersRoute()}/sessions/device`;
        const expectedOptions = {
            method: 'put',
            body: {
                device_id: deviceId,
                device_notification_disabled: 'true',
                mobile_version: version,
            },
        };

        await client.setExtraSessionProps(deviceId, deviceNotificationDisabled, version);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('searchUsers', async () => {
        const term = 'test';
        const options = {team_id: 'team_id'};
        const expectedUrl = `${client.getUsersRoute()}/search`;
        const expectedOptions = {method: 'post', body: {term, ...options}};

        await client.searchUsers(term, options);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getStatusesByIds', async () => {
        const userIds = ['user1', 'user2'];
        const expectedUrl = `${client.getUsersRoute()}/status/ids`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.getStatusesByIds(userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getStatus', async () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/status`;
        const expectedOptions = {method: 'get'};

        await client.getStatus(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateStatus', async () => {
        const status = {user_id: 'user1', status: 'online'} as UserStatus;
        const expectedUrl = `${client.getUserRoute(status.user_id)}/status`;
        const expectedOptions = {method: 'put', body: status};

        await client.updateStatus(status);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateCustomStatus', async () => {
        const customStatus = {emoji: 'smile', text: 'Happy'};
        const expectedUrl = `${client.getUserRoute('me')}/status/custom`;
        const expectedOptions = {method: 'put', body: customStatus};

        await client.updateCustomStatus(customStatus);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('unsetCustomStatus', async () => {
        const expectedUrl = `${client.getUserRoute('me')}/status/custom`;
        const expectedOptions = {method: 'delete'};

        await client.unsetCustomStatus();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('removeRecentCustomStatus', async () => {
        const customStatus = {emoji: 'smile', text: 'Happy'};
        const expectedUrl = `${client.getUserRoute('me')}/status/custom/recent/delete`;
        const expectedOptions = {method: 'post', body: customStatus};

        await client.removeRecentCustomStatus(customStatus);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
