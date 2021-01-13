// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {AT_MENTION_REGEX_GLOBAL, CODE_REGEX} from '@constants/autocomplete';
import {NOTIFY_ALL_MEMBERS} from '@constants/view';
import {General} from '@mm-redux/constants';
import {alertErrorWithFallback} from '@utils/general';
import {t} from '@utils/i18n';

export function alertAttachmentFail(formatMessage, accept, cancel) {
    Alert.alert(
        formatMessage({
            id: 'mobile.post_textbox.uploadFailedTitle',
            defaultMessage: 'Attachment failure',
        }),
        formatMessage({
            id: 'mobile.post_textbox.uploadFailedDesc',
            defaultMessage: 'Some attachments failed to upload to the server. Are you sure you want to post the message?',
        }),
        [{
            text: formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'}),
            onPress: cancel,
        }, {
            text: formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
            onPress: accept,
        }],
    );
}

export function alertChannelWideMention(formatMessage, notifyAllMessage, accept, cancel) {
    Alert.alert(
        formatMessage({
            id: 'mobile.post_textbox.entire_channel.title',
            defaultMessage: 'Confirm sending notifications to entire channel',
        }),
        notifyAllMessage,
        [
            {
                text: formatMessage({
                    id: 'mobile.post_textbox.entire_channel.cancel',
                    defaultMessage: 'Cancel',
                }),
                onPress: cancel,
            },
            {
                text: formatMessage({
                    id: 'mobile.post_textbox.entire_channel.confirm',
                    defaultMessage: 'Confirm',
                }),
                onPress: accept,
            },
        ],
    );
}

export function alertSendToGroups(formatMessage, notifyAllMessage, accept, cancel) {
    Alert.alert(
        formatMessage({
            id: 'mobile.post_textbox.groups.title',
            defaultMessage: 'Confirm sending notifications to groups',
        }),
        notifyAllMessage,
        [
            {
                text: formatMessage({
                    id: 'mobile.post_textbox.entire_channel.cancel',
                    defaultMessage: 'Cancel',
                }),
                onPress: cancel,
            },
            {
                text: formatMessage({
                    id: 'mobile.post_textbox.entire_channel.confirm',
                    defaultMessage: 'Confirm',
                }),
                onPress: accept,
            },
        ],
    );
}

export function errorBadChannel(intl) {
    const message = {
        id: t('mobile.server_link.unreachable_channel.error'),
        defaultMessage: 'This link belongs to a deleted channel or to a channel to which you do not have access.',
    };

    alertErrorWithFallback(intl, {}, message);
}

export function errorBadUser(intl) {
    const message = {
        id: t('mobile.server_link.unreachable_user.error'),
        defaultMessage: 'This link belongs to a deleted user.',
    };

    alertErrorWithFallback(intl, {}, message);
}

export function alertSlashCommandFailed(formatMessage, error) {
    Alert.alert(
        formatMessage({
            id: 'mobile.commands.error_title',
            defaultMessage: 'Error Executing Command',
        }),
        error,
    );
}

export function buildChannelWideMentionMessage(formatMessage, membersCount, isTimezoneEnabled, channelTimezoneCount) {
    let notifyAllMessage = '';
    if (isTimezoneEnabled && channelTimezoneCount) {
        notifyAllMessage = (
            formatMessage(
                {
                    id: 'mobile.post_textbox.entire_channel.message.with_timezones',
                    defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}} in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?',
                },
                {
                    totalMembers: membersCount - 1,
                    timezones: channelTimezoneCount,
                },
            )
        );
    } else {
        notifyAllMessage = (
            formatMessage(
                {
                    id: 'mobile.post_textbox.entire_channel.message',
                    defaultMessage: 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}}. Are you sure you want to do this?',
                },
                {
                    totalMembers: membersCount - 1,
                },
            )
        );
    }

    return notifyAllMessage;
}

export function buildGroupMentionsMessage(formatMessage, groupMentions, memberNotifyCount, channelTimezoneCount) {
    let notifyAllMessage = '';

    if (groupMentions.length === 1) {
        if (channelTimezoneCount > 0) {
            notifyAllMessage = (
                formatMessage(
                    {
                        id: 'mobile.post_textbox.one_group.message.with_timezones',
                        defaultMessage: 'By using {mention} you are about to send notifications to {totalMembers} people in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?',
                    },
                    {
                        mention: groupMentions[0],
                        totalMembers: memberNotifyCount,
                        timezones: channelTimezoneCount,
                    },
                )
            );
        } else {
            notifyAllMessage = (
                formatMessage(
                    {
                        id: 'mobile.post_textbox.one_group.message.without_timezones',
                        defaultMessage: 'By using {mention} you are about to send notifications to {totalMembers} people. Are you sure you want to do this?',
                    },
                    {
                        mention: groupMentions[0],
                        totalMembers: memberNotifyCount,
                    },
                )
            );
        }
    } else if (channelTimezoneCount > 0) {
        notifyAllMessage = (
            formatMessage(
                {
                    id: 'mobile.post_textbox.multi_group.message.with_timezones',
                    defaultMessage: 'By using {mentions} and {finalMention} you are about to send notifications to at least {totalMembers} people in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?',
                },
                {
                    mentions: groupMentions.slice(0, -1).join(', '),
                    finalMention: groupMentions[groupMentions.length - 1],
                    totalMembers: memberNotifyCount,
                    timezones: channelTimezoneCount,
                },
            )
        );
    } else {
        notifyAllMessage = (
            formatMessage(
                {
                    id: 'mobile.post_textbox.multi_group.message.without_timezones',
                    defaultMessage: 'By using {mentions} and {finalMention} you are about to send notifications to at least {totalMembers} people. Are you sure you want to do this?',
                },
                {
                    mentions: groupMentions.slice(0, -1).join(', '),
                    finalMention: groupMentions[groupMentions.length - 1],
                    totalMembers: memberNotifyCount,
                },
            )
        );
    }

    return notifyAllMessage;
}

export const getStatusFromSlashCommand = (message) => {
    const tokens = message.split(' ');

    if (tokens.length > 0) {
        return tokens[0].substring(1);
    }
    return '';
};

export const groupsMentionedInText = (groupsWithAllowReference, text) => {
    const groups = [];
    if (groupsWithAllowReference.size > 0) {
        const textWithoutCode = text.replace(CODE_REGEX, '');
        const mentions = textWithoutCode.match(AT_MENTION_REGEX_GLOBAL) || [];
        mentions.forEach((mention) => {
            const group = groupsWithAllowReference.get(mention);
            if (group) {
                groups.push(group);
            }
        });
    }
    return groups;
};

export const isStatusSlashCommand = (command) => {
    return command === General.ONLINE || command === General.AWAY ||
        command === General.DND || command === General.OFFLINE;
};

export const mapGroupMentions = (channelMemberCountsByGroup, groupMentions) => {
    let memberNotifyCount = 0;
    let channelTimezoneCount = 0;
    const groupMentionsSet = new Set();
    groupMentions.
        forEach((group) => {
            const mappedValue = channelMemberCountsByGroup[group.id];
            if (mappedValue?.channel_member_count > NOTIFY_ALL_MEMBERS && mappedValue?.channel_member_count > memberNotifyCount) {
                memberNotifyCount = mappedValue.channel_member_count;
                channelTimezoneCount = mappedValue.channel_member_timezones_count;
            }
            groupMentionsSet.add(`@${group.name}`);
        });
    return {groupMentionsSet, memberNotifyCount, channelTimezoneCount};
};

export const textContainsAtAllAtChannel = (text) => {
    const textWithoutCode = text.replace(CODE_REGEX, '');
    return (/(?:\B|\b_+)@(channel|all)(?!(\.|-|_)*[^\W_])/i).test(textWithoutCode);
};
