// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type MessageDescriptor} from 'react-intl';

import keyMirror from '@utils/key_mirror';

import type {CompassIconName} from '@components/compass_icon';

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
    EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE: null,
    EPHEMERAL_MODE_ENABLED: null,
    EPHEMERAL_MODE_SETTINGS_UPDATED: null,
    EPHEMERAL_MODE_DISABLED: null,
    EPHEMERAL_MODE_DISCONNECTED: null,
    EPHEMERAL_MODE_WIPE_WARNING: null,
    EPHEMERAL_MODE_CACHE_CLEANUP: null,
});

export const MESSAGE_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    DEFAULT: 'default',
};

export type SnackBarConfig = {
    message: MessageDescriptor;
    description?: MessageDescriptor;
    iconName: CompassIconName;
    hasAction: boolean;
    type?: typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];
    isPersistent?: boolean;
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
    EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE: {
        id: 'snack.bar.ephemeral_mode.zero_persistence_active',
        defaultMessage: 'Running in Zero Persistence Mode',
    },
    EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE_DESCRIPTION: {
        id: 'snack.bar.ephemeral_mode.zero_persistence_active.description',
        defaultMessage: 'Your organization has enabled Zero Persistence on this device.\nMessages and files are never saved locally and are discarded when you leave the app',
    },
    EPHEMERAL_MODE_ENABLED: {
        id: 'snack.bar.ephemeral_mode.enabled',
        defaultMessage: 'Ephemeral mode is on',
    },
    EPHEMERAL_MODE_ENABLED_DESCRIPTION: {
        id: 'snack.bar.ephemeral_mode.enabled.description',
        defaultMessage: 'Your organization has enabled data lifecycle controls on this device.\nMessages and files are deleted after {hours, number} {hours, plural, one {hour} other {hours}} offline, and anything older than {days, number} {days, plural, one {day} other {days}} is removed automatically',
    },
    EPHEMERAL_MODE_SETTINGS_UPDATED: {
        id: 'snack.bar.ephemeral_mode.settings_updated',
        defaultMessage: 'Ephemeral mode settings updated',
    },
    EPHEMERAL_MODE_SETTINGS_UPDATED_DESCRIPTION: {
        id: 'snack.bar.ephemeral_mode.settings_updated.description',
        defaultMessage: 'Messages and files are deleted after {hours, number} {hours, plural, one {hour} other {hours}} offline, and anything older than {days, number} {days, plural, one {day} other {days}} is removed automatically',
    },
    EPHEMERAL_MODE_DISABLED: {
        id: 'snack.bar.ephemeral_mode.disabled',
        defaultMessage: 'Ephemeral mode has been disabled',
    },
    EPHEMERAL_MODE_DISCONNECTED: {
        id: 'snack.bar.ephemeral_mode.disconnected',
        defaultMessage: 'You are now offline',
    },
    EPHEMERAL_MODE_WIPE_WARNING: {
        id: 'snack.bar.ephemeral_mode.wipe_warning',
        defaultMessage: 'Cached data will be erased in {minutes, number} {minutes, plural, one {minute} other {minutes}}',
    },
    EPHEMERAL_MODE_CACHE_CLEANUP: {
        id: 'snack.bar.ephemeral_mode.cache_cleanup',
        defaultMessage: '{count, plural, one {# post} other {# posts}} older than {days, number} {days, plural, one {day} other {days}} removed from this device',
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
    EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE: {
        message: messages.EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE,
        description: messages.EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE_DESCRIPTION,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
        isPersistent: true,
    },
    EPHEMERAL_MODE_ENABLED: {
        message: messages.EPHEMERAL_MODE_ENABLED,
        description: messages.EPHEMERAL_MODE_ENABLED_DESCRIPTION,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
        isPersistent: true,
    },
    EPHEMERAL_MODE_SETTINGS_UPDATED: {
        message: messages.EPHEMERAL_MODE_SETTINGS_UPDATED,
        description: messages.EPHEMERAL_MODE_SETTINGS_UPDATED_DESCRIPTION,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
        isPersistent: true,
    },
    EPHEMERAL_MODE_DISABLED: {
        message: messages.EPHEMERAL_MODE_DISABLED,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
    },
    EPHEMERAL_MODE_DISCONNECTED: {
        message: messages.EPHEMERAL_MODE_DISCONNECTED,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
    },
    EPHEMERAL_MODE_WIPE_WARNING: {
        message: messages.EPHEMERAL_MODE_WIPE_WARNING,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.ERROR,
        isPersistent: true,
    },
    EPHEMERAL_MODE_CACHE_CLEANUP: {
        message: messages.EPHEMERAL_MODE_CACHE_CLEANUP,
        iconName: 'shield-lock-outline',
        hasAction: false,
        type: MESSAGE_TYPE.DEFAULT,
    },
};

export default {
    SNACK_BAR_TYPE,
    SNACK_BAR_CONFIG,
};
