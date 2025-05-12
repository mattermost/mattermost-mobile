// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import {Channel, General, Permissions} from '@constants';
import {hasPermission} from '@utils/role';

import {
    compareNotifyProps,
    filterChannelsMatchingTerm,
    generateChannelNameFromDisplayName,
    getDirectChannelName,
    isArchived,
    isDefaultChannel,
    isDMorGM,
    isTypeDMorGM,
    selectDefaultChannelForTeam,
    sortChannelsByDisplayName,
    sortChannelsModelByDisplayName,
    validateDisplayName,
} from '.';

import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@utils/role', () => ({
    hasPermission: jest.fn(() => true),
}));

jest.mock('@utils/general', () => ({
    generateId: jest.fn(() => 'generated-id'),
}));

describe('getDirectChannelName', () => {
    it('should return the correct direct channel name', () => {
        expect(getDirectChannelName('id1', 'id2')).toBe('id1__id2');
        expect(getDirectChannelName('id2', 'id1')).toBe('id1__id2');
    });
});

describe('isDMorGM', () => {
    it('should return true for DM or GM channels', () => {
        expect(isDMorGM({type: General.DM_CHANNEL} as Channel)).toBe(true);
        expect(isDMorGM({type: General.GM_CHANNEL} as Channel)).toBe(true);
    });

    it('should return false for other channel types', () => {
        expect(isDMorGM({type: General.OPEN_CHANNEL} as Channel)).toBe(false);
    });
});

describe('isTypeDMorGM', () => {
    it('should return true for DM or GM channel types', () => {
        expect(isTypeDMorGM(General.DM_CHANNEL)).toBe(true);
        expect(isTypeDMorGM(General.GM_CHANNEL)).toBe(true);
    });

    it('should return false for other channel types', () => {
        expect(isTypeDMorGM(General.OPEN_CHANNEL)).toBe(false);
        expect(isTypeDMorGM(undefined)).toBe(false);
    });
});

describe('isArchived', () => {
    it('should return true if channel is archived', () => {
        expect(isArchived({delete_at: 12345} as Channel)).toBe(true);
        expect(isArchived({deleteAt: 12345} as ChannelModel)).toBe(true);
    });

    it('should return false if channel is not archived', () => {
        expect(isArchived({delete_at: 0} as Channel)).toBe(false);
        expect(isArchived({deleteAt: 0} as ChannelModel)).toBe(false);
    });
});

describe('selectDefaultChannelForTeam', () => {
    const channels = [
        {id: '1', name: General.DEFAULT_CHANNEL, team_id: 'team1', type: General.OPEN_CHANNEL},
        {id: '2', name: 'random', team_id: 'team1', type: General.OPEN_CHANNEL},
    ] as Channel[];

    const memberships = [
        {channel_id: '2'},
    ] as ChannelMembership[];

    const roles = [
        {permissions: [Permissions.JOIN_PUBLIC_CHANNELS]},
    ] as Role[];

    it('should select the default channel if user is a member', () => {
        const result = selectDefaultChannelForTeam(channels, memberships, 'team1', roles);
        expect(result).toEqual(channels[0]);

        const channelModels = [
            {id: '1', name: General.DEFAULT_CHANNEL, teamId: 'team1', type: General.OPEN_CHANNEL},
            {id: '2', name: 'random', teamId: 'team1', type: General.OPEN_CHANNEL},
        ] as ChannelModel[];
        const result2 = selectDefaultChannelForTeam(channelModels, memberships, 'team1', roles);
        expect(result2).toEqual(channelModels[0]);
    });

    it('should select the first channel in the team if user can join public channels', () => {
        const result = selectDefaultChannelForTeam(channels, [], 'team1', roles);
        expect(result).toEqual(channels[0]);
    });

    it('should select the first channel in the team if user cannot join public channels', () => {
        (hasPermission as jest.Mock).mockReturnValueOnce(false);
        const result = selectDefaultChannelForTeam(channels, memberships, 'team1', roles);
        expect(result).toEqual(channels[1]);
    });

    it('should select the default channel in the team if user cannot join public channels', () => {
        (hasPermission as jest.Mock).mockReturnValueOnce(false);
        const memberOf = [
            {channel_id: '1'},
        ] as ChannelMembership[];
        const result = selectDefaultChannelForTeam(channels, memberOf, 'team1', roles);
        expect(result).toEqual(channels[0]);
    });

    it('should return undefined if no channels are available', () => {
        const result = selectDefaultChannelForTeam([], [], 'team1', roles);
        expect(result).toBeUndefined();
    });
});

describe('sortChannelsByDisplayName', () => {
    it('should sort channels by display name', () => {
        const channels = [
            {name: 'name1', display_name: 'Zeta'},
            {name: 'name2', display_name: 'Alpha'},
        ] as Channel[];

        const channelsModels = [
            {name: 'name1', displayName: 'Zeta'},
            {name: 'name2', displayName: 'Alpha'},
        ] as ChannelModel[];

        const result = channels.sort((a, b) => sortChannelsByDisplayName('en', a, b));
        expect(result[0].name).toBe('name2');

        const result2 = channelsModels.sort((a, b) => sortChannelsByDisplayName('en', a, b));
        expect(result2[0].name).toBe('name2');
    });

    it('should sort channels by name if display name is not defined', () => {
        const channels = [
            {name: 'Zeta'},
            {name: 'Alpha'},
        ] as Channel[];

        const result = channels.sort((a, b) => sortChannelsByDisplayName('en', a, b));
        expect(result[0].name).toBe('Alpha');
    });
});

describe('sortChannelsModelByDisplayName', () => {
    it('should sort channel models by display name', () => {
        const channels = [
            {name: 'name1', displayName: 'Zeta'},
            {name: 'name2', displayName: 'Alpha'},
        ] as ChannelModel[];

        const result = channels.sort((a, b) => sortChannelsModelByDisplayName('en', a, b));
        expect(result[0].name).toBe('name2');
    });

    it('should sort channel models by name if display name is not defined', () => {
        const channels = [
            {name: 'Zeta'},
            {name: 'Alpha'},
        ] as ChannelModel[];

        const result = channels.sort((a, b) => sortChannelsModelByDisplayName('en', a, b));
        expect(result[0].name).toBe('Alpha');
    });
});

describe('validateDisplayName', () => {
    const intl = createIntl({locale: 'en', messages: {}});
    it('should return an error if display name is empty', () => {
        const result = validateDisplayName(intl, '');
        expect(result.error).toBe('Channel name is required');
    });

    it('should return an error if display name is too long', () => {
        const result = validateDisplayName(intl, 'a'.repeat(100));
        expect(result.error).toBe('Channel name must be less than 64 characters');
    });

    it('should return an error if display name is too short', () => {
        const minLength = Channel.MIN_CHANNEL_NAME_LENGTH;
        Channel.MIN_CHANNEL_NAME_LENGTH = 2;
        const result = validateDisplayName(intl, 'a');
        expect(result.error).toBe('Channel name must be 2 or more characters');
        Channel.MIN_CHANNEL_NAME_LENGTH = minLength;
    });

    it('should return no error if display name is valid', () => {
        const result = validateDisplayName(intl, 'valid name');
        expect(result.error).toBe('');
    });
});

describe('generateChannelNameFromDisplayName', () => {
    it('should generate a channel name from display name', () => {
        const result = generateChannelNameFromDisplayName('Valid Name');
        expect(result).toBe('valid-name');
    });

    it('should generate an ID if display name is empty after cleanup', () => {
        const result = generateChannelNameFromDisplayName('');
        expect(result).toBe('generated-id');
    });
});

describe('compareNotifyProps', () => {
    it('should return true if notify props are equal', () => {
        const propsA: Partial<ChannelNotifyProps> = {desktop: 'default', email: 'default', mark_unread: 'all', push: 'default', ignore_channel_mentions: 'default'};
        const propsB = {...propsA};
        expect(compareNotifyProps(propsA, propsB)).toBe(true);
    });

    it('should return false if notify props are different', () => {
        const propsA: Partial<ChannelNotifyProps> = {desktop: 'default', email: 'default', mark_unread: 'all', push: 'default', ignore_channel_mentions: 'default'};
        const propsB: Partial<ChannelNotifyProps> = {...propsA, desktop: 'none'};
        expect(compareNotifyProps(propsA, propsB)).toBe(false);
    });
});

describe('filterChannelsMatchingTerm', () => {
    const channels = [
        {name: 'channel1', display_name: 'Channel One'},
        {name: 'channel2', display_name: 'Channel Two'},
        {display_name: 'Undefined name'},
        {},
    ] as Channel[];

    it('should filter channels by name or display name', () => {
        let result = filterChannelsMatchingTerm(channels, 'channel1');
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('channel1');

        result = filterChannelsMatchingTerm(channels, 'Channel One');
        expect(result.length).toBe(1);
        expect(result[0].display_name).toBe('Channel One');

        result = filterChannelsMatchingTerm([...channels, undefined] as Channel[], 'Channel One');
        expect(result.length).toBe(1);
        expect(result[0].display_name).toBe('Channel One');
    });

    it('should return an empty array if no channels match the term', () => {
        const result = filterChannelsMatchingTerm(channels, 'nonexistent');
        expect(result.length).toBe(0);
    });
});

describe('isDefaultChannel', () => {
    it('should return true if channel is the default channel', () => {
        const channel = {name: General.DEFAULT_CHANNEL} as Channel; // using casting instead of TestHelper to avoid circular dependency
        expect(isDefaultChannel(channel)).toBe(true);
    });

    it('should return false if channel is not the default channel', () => {
        const channel = {name: 'random'} as Channel; // using casting instead of TestHelper to avoid circular dependency
        expect(isDefaultChannel(channel)).toBe(false);
    });

    it('should return false if channel is undefined', () => {
        expect(isDefaultChannel(undefined)).toBe(false);
    });
});
