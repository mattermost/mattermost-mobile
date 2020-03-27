// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import deepFreezeAndThrowOnMutation from '@redux/utils/deep_freeze';
import TestHelper from 'test/test_helper';
import * as Selectors from '@redux/selectors/entities/roles';
import {General} from '../../constants';
import {getMySystemPermissions, getMySystemRoles, getRoles} from '@redux/selectors/entities/roles_helpers';

describe('Selectors.Roles', () => {
    const team1 = TestHelper.fakeTeamWithId();
    const team2 = TestHelper.fakeTeamWithId();
    const team3 = TestHelper.fakeTeamWithId();
    const myTeamMembers = {};
    myTeamMembers[team1.id] = {roles: 'test_team1_role1 test_team1_role2'};
    myTeamMembers[team2.id] = {roles: 'test_team2_role1 test_team2_role2'};
    myTeamMembers[team3.id] = {};

    const channel1 = TestHelper.fakeChannelWithId(team1.id);
    channel1.display_name = 'Channel Name';

    const channel2 = TestHelper.fakeChannelWithId(team1.id);
    channel2.total_msg_count = 2;
    channel2.display_name = 'DEF';

    const channel3 = TestHelper.fakeChannelWithId(team2.id);
    channel3.total_msg_count = 2;

    const channel4 = TestHelper.fakeChannelWithId('');
    channel4.display_name = 'Channel 4';

    const channel5 = TestHelper.fakeChannelWithId(team1.id);
    channel5.type = General.PRIVATE_CHANNEL;
    channel5.display_name = 'Channel 5';

    const channel6 = TestHelper.fakeChannelWithId(team1.id);
    const channel7 = TestHelper.fakeChannelWithId('');
    channel7.display_name = '';
    channel7.type = General.GM_CHANNEL;
    channel7.total_msg_count = 1;

    const channel8 = TestHelper.fakeChannelWithId(team1.id);
    channel8.display_name = 'ABC';
    channel8.total_msg_count = 1;

    const channel9 = TestHelper.fakeChannelWithId(team1.id);
    const channel10 = TestHelper.fakeChannelWithId(team1.id);
    const channel11 = TestHelper.fakeChannelWithId(team1.id);
    channel11.type = General.PRIVATE_CHANNEL;
    const channel12 = TestHelper.fakeChannelWithId(team1.id);

    const channels = {};
    channels[channel1.id] = channel1;
    channels[channel2.id] = channel2;
    channels[channel3.id] = channel3;
    channels[channel4.id] = channel4;
    channels[channel5.id] = channel5;
    channels[channel6.id] = channel6;
    channels[channel7.id] = channel7;
    channels[channel8.id] = channel8;
    channels[channel9.id] = channel9;
    channels[channel10.id] = channel10;
    channels[channel11.id] = channel11;
    channels[channel12.id] = channel12;

    const channelsInTeam = {};
    channelsInTeam[team1.id] = [channel1.id, channel2.id, channel5.id, channel6.id, channel8.id, channel10.id, channel11.id];
    channelsInTeam[team2.id] = [channel3.id];
    channelsInTeam[''] = [channel4.id, channel7.id, channel9.id];

    const user = TestHelper.fakeUserWithId();
    const profiles = {};
    profiles[user.id] = user;
    profiles[user.id].roles = 'test_user_role test_user_role2';

    const myChannelMembers = {};
    myChannelMembers[channel1.id] = {roles: 'test_channel_a_role1 test_channel_a_role2'};
    myChannelMembers[channel2.id] = {roles: 'test_channel_a_role1 test_channel_a_role2'};
    myChannelMembers[channel3.id] = {roles: 'test_channel_a_role1 test_channel_a_role2'};
    myChannelMembers[channel4.id] = {roles: 'test_channel_a_role1 test_channel_a_role2'};
    myChannelMembers[channel5.id] = {roles: 'test_channel_a_role1 test_channel_a_role2'};
    myChannelMembers[channel7.id] = {roles: 'test_channel_b_role1 test_channel_b_role2'};
    myChannelMembers[channel8.id] = {roles: 'test_channel_b_role1 test_channel_b_role2'};
    myChannelMembers[channel9.id] = {roles: 'test_channel_b_role1 test_channel_b_role2'};
    myChannelMembers[channel10.id] = {roles: 'test_channel_c_role1 test_channel_c_role2'};
    myChannelMembers[channel11.id] = {roles: 'test_channel_c_role1 test_channel_c_role2'};
    myChannelMembers[channel12.id] = {};
    const roles = {
        test_team1_role1: {permissions: ['team1_role1']},
        test_team2_role1: {permissions: ['team2_role1']},
        test_team2_role2: {permissions: ['team2_role2']},
        test_channel_a_role1: {permissions: ['channel_a_role1']},
        test_channel_a_role2: {permissions: ['channel_a_role2']},
        test_channel_b_role2: {permissions: ['channel_b_role2']},
        test_channel_c_role1: {permissions: ['channel_c_role1']},
        test_channel_c_role2: {permissions: ['channel_c_role2']},
        test_user_role2: {permissions: ['user_role2']},
    };

    const testState = deepFreezeAndThrowOnMutation({
        entities: {
            users: {
                currentUserId: user.id,
                profiles,
            },
            teams: {
                currentTeamId: team1.id,
                myMembers: myTeamMembers,
            },
            channels: {
                currentChannelId: channel1.id,
                channels,
                myMembers: myChannelMembers,
            },
            roles: {
                roles,
            },
        },
    });

    it('should return my roles by scope on getMyRoles/getMySystemRoles/getMyTeamRoles/getMyChannelRoles', () => {
        const teamsRoles = {};
        teamsRoles[team1.id] = new Set(['test_team1_role1', 'test_team1_role2']);
        teamsRoles[team2.id] = new Set(['test_team2_role1', 'test_team2_role2']);
        const channelsRoles = {};
        channelsRoles[channel1.id] = new Set(['test_channel_a_role1', 'test_channel_a_role2']);
        channelsRoles[channel2.id] = new Set(['test_channel_a_role1', 'test_channel_a_role2']);
        channelsRoles[channel3.id] = new Set(['test_channel_a_role1', 'test_channel_a_role2']);
        channelsRoles[channel4.id] = new Set(['test_channel_a_role1', 'test_channel_a_role2']);
        channelsRoles[channel5.id] = new Set(['test_channel_a_role1', 'test_channel_a_role2']);
        channelsRoles[channel7.id] = new Set(['test_channel_b_role1', 'test_channel_b_role2']);
        channelsRoles[channel8.id] = new Set(['test_channel_b_role1', 'test_channel_b_role2']);
        channelsRoles[channel9.id] = new Set(['test_channel_b_role1', 'test_channel_b_role2']);
        channelsRoles[channel10.id] = new Set(['test_channel_c_role1', 'test_channel_c_role2']);
        channelsRoles[channel11.id] = new Set(['test_channel_c_role1', 'test_channel_c_role2']);
        const myRoles = {
            system: new Set(['test_user_role', 'test_user_role2']),
            team: teamsRoles,
            channel: channelsRoles,
        };
        assert.deepEqual(Selectors.getMyRoles(testState), myRoles);
        assert.deepEqual(getMySystemRoles(testState), myRoles.system);
        assert.deepEqual(Selectors.getMyTeamRoles(testState), myRoles.team);
        assert.deepEqual(Selectors.getMyChannelRoles(testState), myRoles.channel);
    });

    it('should return current loaded roles on getRoles', () => {
        const loadedRoles = {
            test_team1_role1: {permissions: ['team1_role1']},
            test_team2_role1: {permissions: ['team2_role1']},
            test_team2_role2: {permissions: ['team2_role2']},
            test_channel_a_role1: {permissions: ['channel_a_role1']},
            test_channel_a_role2: {permissions: ['channel_a_role2']},
            test_channel_b_role2: {permissions: ['channel_b_role2']},
            test_channel_c_role1: {permissions: ['channel_c_role1']},
            test_channel_c_role2: {permissions: ['channel_c_role2']},
            test_user_role2: {permissions: ['user_role2']},
        };
        assert.deepEqual(getRoles(testState), loadedRoles);
    });

    it('should return my system permission on getMySystemPermissions', () => {
        assert.deepEqual(getMySystemPermissions(testState), new Set([
            'user_role2',
        ]));
    });

    it('should return if i have a system permission on haveISystemPermission', () => {
        assert.equal(Selectors.haveISystemPermission(testState, {permission: 'user_role2'}), true);
        assert.equal(Selectors.haveISystemPermission(testState, {permission: 'invalid_permission'}), false);
    });

    it('should return my team permission on getMyTeamPermissions', () => {
        assert.deepEqual(Selectors.getMyTeamPermissions(testState, {team: team1.id}), new Set([
            'user_role2', 'team1_role1',
        ]));
    });

    it('should return if i have a team permission on haveITeamPermission', () => {
        assert.equal(Selectors.haveITeamPermission(testState, {team: team1.id, permission: 'user_role2'}), true);
        assert.equal(Selectors.haveITeamPermission(testState, {team: team1.id, permission: 'team1_role1'}), true);
        assert.equal(Selectors.haveITeamPermission(testState, {team: team1.id, permission: 'team2_role2'}), false);
        assert.equal(Selectors.haveITeamPermission(testState, {team: team1.id, permission: 'invalid_permission'}), false);
    });

    it('should return my team permission on getMyCurrentTeamPermissions', () => {
        assert.deepEqual(Selectors.getMyCurrentTeamPermissions(testState), new Set([
            'user_role2', 'team1_role1',
        ]));
    });

    it('should return if i have a team permission on haveICurrentTeamPermission', () => {
        assert.equal(Selectors.haveICurrentTeamPermission(testState, {permission: 'user_role2'}), true);
        assert.equal(Selectors.haveICurrentTeamPermission(testState, {permission: 'team1_role1'}), true);
        assert.equal(Selectors.haveICurrentTeamPermission(testState, {permission: 'team2_role2'}), false);
        assert.equal(Selectors.haveICurrentTeamPermission(testState, {permission: 'invalid_permission'}), false);
    });

    it('should return my channel permission on getMyChannelPermissions', () => {
        assert.deepEqual(Selectors.getMyChannelPermissions(testState, {team: team1.id, channel: channel1.id}), new Set([
            'user_role2', 'team1_role1', 'channel_a_role1', 'channel_a_role2',
        ]));
    });

    it('should return if i have a channel permission on haveIChannelPermission', () => {
        assert.equal(Selectors.haveIChannelPermission(testState, {team: team1.id, channel: channel1.id, permission: 'user_role2'}), true);
        assert.equal(Selectors.haveIChannelPermission(testState, {team: team1.id, channel: channel1.id, permission: 'team1_role1'}), true);
        assert.equal(Selectors.haveIChannelPermission(testState, {team: team1.id, channel: channel1.id, permission: 'team2_role2'}), false);
        assert.equal(Selectors.haveIChannelPermission(testState, {team: team1.id, channel: channel1.id, permission: 'channel_a_role1'}), true);
        assert.equal(Selectors.haveIChannelPermission(testState, {team: team1.id, channel: channel1.id, permission: 'channel_b_role1'}), false);
    });

    it('should return my current channel permission on getMyCurrentChannelPermissions', () => {
        assert.deepEqual(Selectors.getMyCurrentChannelPermissions(testState), new Set([
            'user_role2', 'team1_role1', 'channel_a_role1', 'channel_a_role2',
        ]));
    });

    it('should return if i have a channel permission on haveICurrentChannelPermission', () => {
        assert.equal(Selectors.haveICurrentChannelPermission(testState, {permission: 'user_role2'}), true);
        assert.equal(Selectors.haveICurrentChannelPermission(testState, {permission: 'team1_role1'}), true);
        assert.equal(Selectors.haveICurrentChannelPermission(testState, {permission: 'team2_role2'}), false);
        assert.equal(Selectors.haveICurrentChannelPermission(testState, {permission: 'channel_a_role1'}), true);
        assert.equal(Selectors.haveICurrentChannelPermission(testState, {permission: 'channel_b_role1'}), false);
    });
});
