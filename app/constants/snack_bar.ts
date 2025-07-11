// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type MessageDescriptor} from 'react-intl';

import keyMirror from '@utils/key_mirror';

export const SNACK_BAR_TYPE = keyMirror({
    ADD_CHANNEL_MEMBERS: null,
    CODE_COPIED: null,
    FAVORITE_CHANNEL: null,
    FOLLOW_THREAD: null,
    INFO_COPIED: null,
    LINK_COPIED: null,
    LINK_COPY_FAILED: null,
    MESSAGE_COPIED: null,
    MUTE_CHANNEL: null,
    REMOVE_CHANNEL_USER: null,
    TEXT_COPIED: null,
    UNFAVORITE_CHANNEL: null,
    UNMUTE_CHANNEL: null,
    UNFOLLOW_THREAD: null,
    CREATE_POST_ERROR: null,
    CONNECTION_ERROR: null,
    SCHEDULED_POST_CREATION_ERROR: null,
    RESCHEDULED_POST: null,
    DELETE_SCHEDULED_POST_ERROR: null,
    PLAYBOOK_ERROR: null,
});

export const MESSAGE_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    DEFAULT: 'default',
};

export type SnackBarConfig = {
    message: MessageDescriptor;
    iconName: string;
    canUndo: boolean;
    type?: typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];
};

const messages = defineMessages({
    ADD_CHANNEL_MEMBERS: {
        id: 'snack.bar.channel.members.added',
        defaultMessage: '{numMembers, number} {numMembers, plural, one {member} other {members}} added',
    },
    CODE_COPIED: {
        id: 'snack.bar.code.copied',
        defaultMessage: 'Code copied to clipboard',
    },
    FAVORITE_CHANNEL: {
        id: 'snack.bar.favorited.channel',
        defaultMessage: 'This channel was favorited',
    },
    FOLLOW_THREAD: {
        id: 'snack.bar.following.thread',
        defaultMessage: 'Thread followed',
    },
    INFO_COPIED: {
        id: 'snack.bar.info.copied',
        defaultMessage: 'Info copied to clipboard',
    },
    LINK_COPIED: {
        id: 'snack.bar.link.copied',
        defaultMessage: 'Link copied to clipboard',
    },
    LINK_COPY_FAILED: {
        id: 'gallery.copy_link.failed',
        defaultMessage: 'Failed to copy link to clipboard',
    },
    MESSAGE_COPIED: {
        id: 'snack.bar.message.copied',
        defaultMessage: 'Text copied to clipboard',
    },
    MUTE_CHANNEL: {
        id: 'snack.bar.mute.channel',
        defaultMessage: 'This channel was muted',
    },
    REMOVE_CHANNEL_USER: {
        id: 'snack.bar.remove.user',
        defaultMessage: '1 member was removed from the channel',
    },
    TEXT_COPIED: {
        id: 'snack.bar.text.copied',
        defaultMessage: 'Copied to clipboard',
    },
    UNFAVORITE_CHANNEL: {
        id: 'snack.bar.unfavorite.channel',
        defaultMessage: 'This channel was unfavorited',
    },
    UNMUTE_CHANNEL: {
        id: 'snack.bar.unmute.channel',
        defaultMessage: 'This channel was unmuted',
    },
    UNFOLLOW_THREAD: {
        id: 'snack.bar.unfollow.thread',
        defaultMessage: 'Thread unfollowed',
    },
    PLAYBOOK_ERROR: {
        id: 'snack.bar.playbook.error',
        defaultMessage: 'Unable to perform action. Please try again later.',
    },
});

export const SNACK_BAR_CONFIG: Record<string, SnackBarConfig> = {
    ADD_CHANNEL_MEMBERS: {
        message: messages.ADD_CHANNEL_MEMBERS,
        iconName: 'check',
        canUndo: false,
    },
    CODE_COPIED: {
        message: messages.CODE_COPIED,
        iconName: 'content-copy',
        canUndo: false,
    },
    FAVORITE_CHANNEL: {
        message: messages.FAVORITE_CHANNEL,
        iconName: 'star',
        canUndo: true,
    },
    FOLLOW_THREAD: {
        message: messages.FOLLOW_THREAD,
        iconName: 'check',
        canUndo: true,
    },
    INFO_COPIED: {
        message: messages.INFO_COPIED,
        iconName: 'content-copy',
        canUndo: false,
    },
    LINK_COPIED: {
        message: messages.LINK_COPIED,
        iconName: 'link-variant',
        canUndo: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    LINK_COPY_FAILED: {
        message: messages.LINK_COPY_FAILED,
        iconName: 'link-variant',
        canUndo: false,
        type: MESSAGE_TYPE.ERROR,
    },
    MESSAGE_COPIED: {
        message: messages.MESSAGE_COPIED,
        iconName: 'content-copy',
        canUndo: false,
    },
    MUTE_CHANNEL: {
        message: messages.MUTE_CHANNEL,
        iconName: 'bell-off-outline',
        canUndo: true,
    },
    REMOVE_CHANNEL_USER: {
        message: messages.REMOVE_CHANNEL_USER,
        iconName: 'check',
        canUndo: true,
    },
    TEXT_COPIED: {
        message: messages.TEXT_COPIED,
        iconName: 'content-copy',
        canUndo: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    UNFAVORITE_CHANNEL: {
        message: messages.UNFAVORITE_CHANNEL,
        iconName: 'star-outline',
        canUndo: true,
    },
    UNMUTE_CHANNEL: {
        message: messages.UNMUTE_CHANNEL,
        iconName: 'bell-outline',
        canUndo: true,
    },
    UNFOLLOW_THREAD: {
        message: messages.UNFOLLOW_THREAD,
        iconName: 'check',
        canUndo: true,
    },
    PLAYBOOK_ERROR: {
        message: messages.PLAYBOOK_ERROR,
        iconName: 'alert-outline',
        canUndo: false,
        type: MESSAGE_TYPE.ERROR,
    },
};

export default {
    SNACK_BAR_TYPE,
    SNACK_BAR_CONFIG,
};
