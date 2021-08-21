// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@constants';
import {t} from '@i18n';

const {
    JOIN_CHANNEL, ADD_TO_CHANNEL, REMOVE_FROM_CHANNEL, LEAVE_CHANNEL,
    JOIN_TEAM, ADD_TO_TEAM, REMOVE_FROM_TEAM, LEAVE_TEAM,
} = Post.POST_TYPES;

export const postTypeMessages = {
    [JOIN_CHANNEL]: {
        one: {
            id: t('combined_system_message.joined_channel.one'),
            defaultMessage: '{firstUser} **joined the channel**.',
        },
        one_you: {
            id: t('combined_system_message.joined_channel.one_you'),
            defaultMessage: 'You **joined the channel**.',
        },
        two: {
            id: t('combined_system_message.joined_channel.two'),
            defaultMessage: '{firstUser} and {secondUser} **joined the channel**.',
        },
        many_expanded: {
            id: t('combined_system_message.joined_channel.many_expanded'),
            defaultMessage: '{users} and {lastUser} **joined the channel**.',
        },
    },
    [ADD_TO_CHANNEL]: {
        one: {
            id: t('combined_system_message.added_to_channel.one'),
            defaultMessage: '{firstUser} **added to the channel** by {actor}.',
        },
        one_you: {
            id: t('combined_system_message.added_to_channel.one_you'),
            defaultMessage: 'You were **added to the channel** by {actor}.',
        },
        two: {
            id: t('combined_system_message.added_to_channel.two'),
            defaultMessage: '{firstUser} and {secondUser} **added to the channel** by {actor}.',
        },
        many_expanded: {
            id: t('combined_system_message.added_to_channel.many_expanded'),
            defaultMessage: '{users} and {lastUser} were **added to the channel** by {actor}.',
        },
    },
    [REMOVE_FROM_CHANNEL]: {
        one: {
            id: t('combined_system_message.removed_from_channel.one'),
            defaultMessage: '{firstUser} was **removed from the channel**.',
        },
        one_you: {
            id: t('combined_system_message.removed_from_channel.one_you'),
            defaultMessage: 'You were **removed from the channel**.',
        },
        two: {
            id: t('combined_system_message.removed_from_channel.two'),
            defaultMessage: '{firstUser} and {secondUser} were **removed from the channel**.',
        },
        many_expanded: {
            id: t('combined_system_message.removed_from_channel.many_expanded'),
            defaultMessage: '{users} and {lastUser} were **removed from the channel**.',
        },
    },
    [LEAVE_CHANNEL]: {
        one: {
            id: t('combined_system_message.left_channel.one'),
            defaultMessage: '{firstUser} **left the channel**.',
        },
        one_you: {
            id: t('combined_system_message.left_channel.one_you'),
            defaultMessage: 'You **left the channel**.',
        },
        two: {
            id: t('combined_system_message.left_channel.two'),
            defaultMessage: '{firstUser} and {secondUser} **left the channel**.',
        },
        many_expanded: {
            id: t('combined_system_message.left_channel.many_expanded'),
            defaultMessage: '{users} and {lastUser} **left the channel**.',
        },
    },
    [JOIN_TEAM]: {
        one: {
            id: t('combined_system_message.joined_team.one'),
            defaultMessage: '{firstUser} **joined the team**.',
        },
        one_you: {
            id: t('combined_system_message.joined_team.one_you'),
            defaultMessage: 'You **joined the team**.',
        },
        two: {
            id: t('combined_system_message.joined_team.two'),
            defaultMessage: '{firstUser} and {secondUser} **joined the team**.',
        },
        many_expanded: {
            id: t('combined_system_message.joined_team.many_expanded'),
            defaultMessage: '{users} and {lastUser} **joined the team**.',
        },
    },
    [ADD_TO_TEAM]: {
        one: {
            id: t('combined_system_message.added_to_team.one'),
            defaultMessage: '{firstUser} **added to the team** by {actor}.',
        },
        one_you: {
            id: t('combined_system_message.added_to_team.one_you'),
            defaultMessage: 'You were **added to the team** by {actor}.',
        },
        two: {
            id: t('combined_system_message.added_to_team.two'),
            defaultMessage: '{firstUser} and {secondUser} **added to the team** by {actor}.',
        },
        many_expanded: {
            id: t('combined_system_message.added_to_team.many_expanded'),
            defaultMessage: '{users} and {lastUser} were **added to the team** by {actor}.',
        },
    },
    [REMOVE_FROM_TEAM]: {
        one: {
            id: t('combined_system_message.removed_from_team.one'),
            defaultMessage: '{firstUser} was **removed from the team**.',
        },
        one_you: {
            id: t('combined_system_message.removed_from_team.one_you'),
            defaultMessage: 'You were **removed from the team**.',
        },
        two: {
            id: t('combined_system_message.removed_from_team.two'),
            defaultMessage: '{firstUser} and {secondUser} were **removed from the team**.',
        },
        many_expanded: {
            id: t('combined_system_message.removed_from_team.many_expanded'),
            defaultMessage: '{users} and {lastUser} were **removed from the team**.',
        },
    },
    [LEAVE_TEAM]: {
        one: {
            id: t('combined_system_message.left_team.one'),
            defaultMessage: '{firstUser} **left the team**.',
        },
        one_you: {
            id: t('combined_system_message.left_team.one_you'),
            defaultMessage: 'You **left the team**.',
        },
        two: {
            id: t('combined_system_message.left_team.two'),
            defaultMessage: '{firstUser} and {secondUser} **left the team**.',
        },
        many_expanded: {
            id: t('combined_system_message.left_team.many_expanded'),
            defaultMessage: '{users} and {lastUser} **left the team**.',
        },
    },
};

export const systemMessages = {
    [ADD_TO_CHANNEL]: {
        id: t('last_users_message.added_to_channel.type'),
        defaultMessage: 'were **added to the channel** by {actor}.',
    },
    [JOIN_CHANNEL]: {
        id: t('last_users_message.joined_channel.type'),
        defaultMessage: '**joined the channel**.',
    },
    [LEAVE_CHANNEL]: {
        id: t('last_users_message.left_channel.type'),
        defaultMessage: '**left the channel**.',
    },
    [REMOVE_FROM_CHANNEL]: {
        id: t('last_users_message.removed_from_channel.type'),
        defaultMessage: 'were **removed from the channel**.',
    },
    [ADD_TO_TEAM]: {
        id: t('last_users_message.added_to_team.type'),
        defaultMessage: 'were **added to the team** by {actor}.',
    },
    [JOIN_TEAM]: {
        id: t('last_users_message.joined_team.type'),
        defaultMessage: '**joined the team**.',
    },
    [LEAVE_TEAM]: {
        id: t('last_users_message.left_team.type'),
        defaultMessage: '**left the team**.',
    },
    [REMOVE_FROM_TEAM]: {
        id: t('last_users_message.removed_from_team.type'),
        defaultMessage: 'were **removed from the team**.',
    },
};
