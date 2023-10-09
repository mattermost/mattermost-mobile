// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';
import keyMirror from '@utils/key_mirror';

export const SNACK_BAR_TYPE = keyMirror({
    ADD_CHANNEL_MEMBERS: null,
    FAVORITE_CHANNEL: null,
    FOLLOW_THREAD: null,
    INFO_COPIED: null,
    LINK_COPIED: null,
    MESSAGE_COPIED: null,
    MUTE_CHANNEL: null,
    REMOVE_CHANNEL_USER: null,
    TEXT_COPIED: null,
    UNFAVORITE_CHANNEL: null,
    UNMUTE_CHANNEL: null,
    UNFOLLOW_THREAD: null,
});

export const MESSAGE_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    DEFAULT: 'default',
};

type SnackBarConfig = {
    id: string;
    defaultMessage: string;
    iconName: string;
    canUndo: boolean;
    type?: typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];
};

export const SNACK_BAR_CONFIG: Record<string, SnackBarConfig> = {
    ADD_CHANNEL_MEMBERS: {
        id: t('snack.bar.channel.members.added'),
        defaultMessage: '{numMembers, number} {numMembers, plural, one {member} other {members}} added',
        iconName: 'check',
        canUndo: false,
    },
    FAVORITE_CHANNEL: {
        id: t('snack.bar.favorited.channel'),
        defaultMessage: 'This channel was favorited',
        iconName: 'star',
        canUndo: true,
    },
    FOLLOW_THREAD: {
        id: t('snack.bar.following.thread'),
        defaultMessage: 'Thread followed',
        iconName: 'check',
        canUndo: true,
    },
    INFO_COPIED: {
        id: t('snack.bar.info.copied'),
        defaultMessage: 'Info copied to clipboard',
        iconName: 'content-copy',
        canUndo: false,
    },
    LINK_COPIED: {
        id: t('snack.bar.link.copied'),
        defaultMessage: 'Link copied to clipboard',
        iconName: 'link-variant',
        canUndo: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    MESSAGE_COPIED: {
        id: t('snack.bar.message.copied'),
        defaultMessage: 'Text copied to clipboard',
        iconName: 'content-copy',
        canUndo: false,
    },
    MUTE_CHANNEL: {
        id: t('snack.bar.mute.channel'),
        defaultMessage: 'This channel was muted',
        iconName: 'bell-off-outline',
        canUndo: true,
    },
    REMOVE_CHANNEL_USER: {
        id: t('snack.bar.remove.user'),
        defaultMessage: '1 member was removed from the channel',
        iconName: 'check',
        canUndo: true,
    },
    TEXT_COPIED: {
        id: t('snack.bar.text.copied'),
        defaultMessage: 'Copied to clipboard',
        iconName: 'content-copy',
        canUndo: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    UNFAVORITE_CHANNEL: {
        id: t('snack.bar.unfavorite.channel'),
        defaultMessage: 'This channel was unfavorited',
        iconName: 'star-outline',
        canUndo: true,
    },
    UNMUTE_CHANNEL: {
        id: t('snack.bar.unmute.channel'),
        defaultMessage: 'This channel was unmuted',
        iconName: 'bell-outline',
        canUndo: true,
    },
    UNFOLLOW_THREAD: {
        id: t('snack.bar.unfollow.thread'),
        defaultMessage: 'Thread unfollowed',
        iconName: 'check',
        canUndo: true,
    },
};

export default {
    SNACK_BAR_TYPE,
    SNACK_BAR_CONFIG,
};
