// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type MessageDescriptor} from 'react-intl';

import keyMirror from '@utils/key_mirror';

export const SNACK_BAR_TYPE = keyMirror({
    ADD_CHANNEL_MEMBERS: null,
    AGENT_STOP_ERROR: null,
    AGENT_REGENERATE_ERROR: null,
    AGENT_TOOL_APPROVAL_ERROR: null,
    AGENT_TOOL_RESULT_ERROR: null,
    AGENT_FETCH_PRIVATE_ERROR: null,
    CODE_COPIED: null,
    FAVORITE_CHANNEL: null,
    FILE_DOWNLOAD_REJECTED: null,
    FOLLOW_THREAD: null,
    INFO_COPIED: null,
    LINK_COPIED: null,
    LINK_COPY_FAILED: null,
    MESSAGE_COPIED: null,
    MUTE_CHANNEL: null,
    PLUGIN_TOAST: null,
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
    ENABLE_TRANSLATION: null,
    BOR_POST_EXPIRED: null,
});

export const MESSAGE_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    DEFAULT: 'default',
};

export type SnackBarConfig = {
    message: MessageDescriptor;
    iconName: string;
    hasAction: boolean;
    type?: typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];
};

const messages = defineMessages({
    ADD_CHANNEL_MEMBERS: {
        id: 'snack.bar.channel.members.added',
        defaultMessage: '{numMembers, number} {numMembers, plural, one {member} other {members}} added',
    },
    AGENT_STOP_ERROR: {
        id: 'snack.bar.agent.stop.error',
        defaultMessage: 'Failed to stop generation',
    },
    AGENT_REGENERATE_ERROR: {
        id: 'snack.bar.agent.regenerate.error',
        defaultMessage: 'Failed to regenerate response',
    },
    AGENT_TOOL_APPROVAL_ERROR: {
        id: 'snack.bar.agent.tool.approval.error',
        defaultMessage: 'Failed to submit tool approval',
    },
    AGENT_TOOL_RESULT_ERROR: {
        id: 'snack.bar.agent.tool.result.error',
        defaultMessage: 'Failed to submit tool result',
    },
    AGENT_FETCH_PRIVATE_ERROR: {
        id: 'snack.bar.agent.fetch.private.error',
        defaultMessage: 'Failed to fetch private data',
    },
    CODE_COPIED: {
        id: 'snack.bar.code.copied',
        defaultMessage: 'Code copied to clipboard',
    },
    FAVORITE_CHANNEL: {
        id: 'snack.bar.favorited.channel',
        defaultMessage: 'This channel was favorited',
    },
    FILE_DOWNLOAD_REJECTED: {
        id: 'snack.bar.file.download.rejected',
        defaultMessage: 'File access blocked by plugin',
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
    PLUGIN_TOAST: {
        id: 'snack.bar.plugin.toast',
        defaultMessage: 'Notification',
    },
    PLAYBOOK_ERROR: {
        id: 'snack.bar.playbook.error',
        defaultMessage: 'Unable to perform action. Please try again later.',
    },
    ENABLE_TRANSLATION: {
        id: 'snack.bar.enable.translation',
        defaultMessage: 'Enable auto-translation?',
    },
    BOR_POST_EXPIRED: {
        id: 'snack.bar.bor_post_expired.error',
        defaultMessage: 'This burn-on-read post has expired and can no longer be revealed.',
    },
});

export const SNACK_BAR_CONFIG: Record<string, SnackBarConfig> = {
    ADD_CHANNEL_MEMBERS: {
        message: messages.ADD_CHANNEL_MEMBERS,
        iconName: 'check',
        hasAction: false,
    },
    AGENT_STOP_ERROR: {
        message: messages.AGENT_STOP_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    AGENT_REGENERATE_ERROR: {
        message: messages.AGENT_REGENERATE_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    AGENT_TOOL_APPROVAL_ERROR: {
        message: messages.AGENT_TOOL_APPROVAL_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    AGENT_TOOL_RESULT_ERROR: {
        message: messages.AGENT_TOOL_RESULT_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    AGENT_FETCH_PRIVATE_ERROR: {
        message: messages.AGENT_FETCH_PRIVATE_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    CODE_COPIED: {
        message: messages.CODE_COPIED,
        iconName: 'content-copy',
        hasAction: false,
    },
    FAVORITE_CHANNEL: {
        message: messages.FAVORITE_CHANNEL,
        iconName: 'star',
        hasAction: true,
    },
    FILE_DOWNLOAD_REJECTED: {
        message: messages.FILE_DOWNLOAD_REJECTED,
        iconName: 'alert-circle-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    FOLLOW_THREAD: {
        message: messages.FOLLOW_THREAD,
        iconName: 'check',
        hasAction: true,
    },
    INFO_COPIED: {
        message: messages.INFO_COPIED,
        iconName: 'content-copy',
        hasAction: false,
    },
    LINK_COPIED: {
        message: messages.LINK_COPIED,
        iconName: 'link-variant',
        hasAction: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    LINK_COPY_FAILED: {
        message: messages.LINK_COPY_FAILED,
        iconName: 'link-variant',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    MESSAGE_COPIED: {
        message: messages.MESSAGE_COPIED,
        iconName: 'content-copy',
        hasAction: false,
    },
    MUTE_CHANNEL: {
        message: messages.MUTE_CHANNEL,
        iconName: 'bell-off-outline',
        hasAction: true,
    },
    REMOVE_CHANNEL_USER: {
        message: messages.REMOVE_CHANNEL_USER,
        iconName: 'check',
        hasAction: true,
    },
    TEXT_COPIED: {
        message: messages.TEXT_COPIED,
        iconName: 'content-copy',
        hasAction: false,
        type: MESSAGE_TYPE.SUCCESS,
    },
    UNFAVORITE_CHANNEL: {
        message: messages.UNFAVORITE_CHANNEL,
        iconName: 'star-outline',
        hasAction: true,
    },
    UNMUTE_CHANNEL: {
        message: messages.UNMUTE_CHANNEL,
        iconName: 'bell-outline',
        hasAction: true,
    },
    UNFOLLOW_THREAD: {
        message: messages.UNFOLLOW_THREAD,
        iconName: 'check',
        hasAction: true,
    },
    PLUGIN_TOAST: {
        message: messages.PLUGIN_TOAST,
        iconName: 'information-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
    },
    PLAYBOOK_ERROR: {
        message: messages.PLAYBOOK_ERROR,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
    ENABLE_TRANSLATION: {
        message: messages.ENABLE_TRANSLATION,
        iconName: 'globe',
        hasAction: true,
    },
    BOR_POST_EXPIRED: {
        message: messages.BOR_POST_EXPIRED,
        iconName: 'alert-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
    },
};

export default {
    SNACK_BAR_TYPE,
    SNACK_BAR_CONFIG,
};
