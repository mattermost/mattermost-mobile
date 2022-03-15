// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const SNACK_BAR_TYPE = keyMirror({
    LINK_COPIED: null,
    MESSAGE_COPIED: null,
    FOLLOW_THREAD: null,
    MUTE_CHANNEL: null,
    FAILED_TO_SAVE_MESSAGE: null,
});

export const SNACK_BAR_CONFIG = {
    LINK_COPIED: {
        id: 'snack.bar.link.copied',
        defaultMessage: 'Link copied to clipboard',
        iconName: 'check',
        backgroundColor: 'onlineIndicator',
        canUndo: false,
    },
    MESSAGE_COPIED: {
        id: 'snack.bar.message.copied',
        defaultMessage: 'Message copied to clipboard',
        iconName: 'content-copy',
        backgroundColor: 'centerChannelColor',
        canUndo: false,
    },
    FOLLOW_THREAD: {
        id: 'snack.bar.follow.thread',
        defaultMessage: 'You\'re now following this thread',
        iconName: 'message-check-outline',
        backgroundColor: 'centerChannelColor',
        canUndo: true,
    },
    MUTE_CHANNEL: {
        id: 'snack.bar.mute.channel',
        defaultMessage: 'This channel was muted',
        iconName: 'bell-off-outline',
        backgroundColor: 'centerChannelColor',
        canUndo: true,
    },
    FAILED_TO_SAVE_MESSAGE: {
        id: 'snack.bar.image.save.failed',
        defaultMessage: 'Failed to save image',
        iconName: 'alert-outline',
        backgroundColor: 'dndIndicator',
        canUndo: false,
    },
};
