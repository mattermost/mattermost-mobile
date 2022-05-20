// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';
import keyMirror from '@utils/key_mirror';

export const SNACK_BAR_TYPE = keyMirror({
    FAVORITE_CHANNEL: null,
    LINK_COPIED: null,
    MESSAGE_COPIED: null,
    MUTE_CHANNEL: null,
    UNFAVORITE_CHANNEL: null,
    UNMUTE_CHANNEL: null,
});

type SnackBarConfig = {
    id: string;
    defaultMessage: string;
    iconName: string;
    canUndo: boolean;
};

export const SNACK_BAR_CONFIG: Record<string, SnackBarConfig> = {
    FAVORITE_CHANNEL: {
        id: t('snack.bar.favorited.channel'),
        defaultMessage: 'This channel was favorited',
        iconName: 'star',
        canUndo: true,
    },
    LINK_COPIED: {
        id: t('snack.bar.link.copied'),
        defaultMessage: 'Link copied to clipboard',
        iconName: 'link-variant',
        canUndo: false,
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
};

export default {
    SNACK_BAR_TYPE,
    SNACK_BAR_CONFIG,
};
