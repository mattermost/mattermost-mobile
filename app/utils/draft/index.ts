// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import {Alert, AlertButton} from 'react-native';

import {General} from '@constants';
import {AT_MENTION_REGEX_GLOBAL, CODE_REGEX} from '@constants/autocomplete';
import {NOTIFY_ALL_MEMBERS} from '@constants/post_draft';
import {t} from '@i18n';

import type GroupModel from '@typings/database/models/servers/group';
import type {IntlShape} from 'react-intl';

type AlertCallback = (value?: string) => void;

export function errorBadChannel(intl: IntlShape) {
    const message = {
        id: t('mobile.server_link.unreachable_channel.error'),
        defaultMessage: 'This link belongs to a deleted channel or to a channel to which you do not have access.',
    };

    return alertErrorWithFallback(intl, {}, message);
}

export function errorUnkownUser(intl: IntlShape) {
    const message = {
        id: t('mobile.server_link.unreachable_user.error'),
        defaultMessage: 'We can\'t redirect you to the DM. The user specified is unknown.',
    };

    alertErrorWithFallback(intl, {}, message);
}

export function permalinkBadTeam(intl: IntlShape) {
    const message = {
        id: t('mobile.server_link.unreachable_team.error'),
        defaultMessage: 'This link belongs to a deleted team or to a team to which you do not have access.',
    };

    alertErrorWithFallback(intl, {}, message);
}

export function alertErrorWithFallback(intl: IntlShape, error: any, fallback: MessageDescriptor, values?: Record<string, string>, buttons?: AlertButton[]) {
    let msg = error?.message;
    if (!msg || msg === 'Network request failed') {
        msg = intl.formatMessage(fallback, values);
    }
    Alert.alert('', msg, buttons);
}

export function alertAttachmentFail(intl: IntlShape, accept: AlertCallback, cancel: AlertCallback) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.post_textbox.uploadFailedTitle',
            defaultMessage: 'Attachment failure',
        }),
        intl.formatMessage({
            id: 'mobile.post_textbox.uploadFailedDesc',
            defaultMessage: 'Some attachments failed to upload to the server. Are you sure you want to post the message?',
        }),
        [{
            text: intl.formatMessage({id: 'mobile.channel_info.alertNo', defaultMessage: 'No'}),
            onPress: cancel,
        }, {
            text: intl.formatMessage({id: 'mobile.channel_info.alertYes', defaultMessage: 'Yes'}),
            onPress: accept,
        }],
    );
}

export const textContainsAtAllAtChannel = (text: string) => {
    const textWithoutCode = text.replace(CODE_REGEX, '');
    return (/(?:\B|\b_+)@(channel|all)(?!(\.|-|_)*[^\W_])/i).test(textWithoutCode);
};

export const textContainsAtHere = (text: string) => {
    const textWithoutCode = text.replace(CODE_REGEX, '');
    return (/(?:\B|\b_+)@(here)(?!(\.|-|_)*[^\W_])/i).test(textWithoutCode);
};

export const groupsMentionedInText = (groupsWithAllowReference: GroupModel[], text: string) => {
    if (!groupsWithAllowReference.length) {
        return [];
    }
    const textWithoutCode = text.replace(CODE_REGEX, '');
    const mentions = textWithoutCode.match(AT_MENTION_REGEX_GLOBAL) || [];
    return groupsWithAllowReference.filter((g) => mentions.includes(g.id));
};

// mapGroupMentions remove duplicates from the groupMentions, and if any of the
// groups has more members than the NOTIFY_ALL_MEMBERS, return the highest
// number of notifications and the timezones of that group.
export const mapGroupMentions = (channelMemberCountsByGroup: ChannelMemberCountByGroup[], groupMentions: GroupModel[]) => {
    let memberNotifyCount = 0;
    let channelTimezoneCount = 0;
    const groupMentionsSet = new Set<string>();
    const mappedChannelMemberCountsByGroup: ChannelMemberCountsByGroup = {};
    channelMemberCountsByGroup.forEach((group) => {
        mappedChannelMemberCountsByGroup[group.group_id] = group;
    });
    groupMentions.
        forEach((group) => {
            const mappedValue = mappedChannelMemberCountsByGroup[group.id];
            if (mappedValue?.channel_member_count > NOTIFY_ALL_MEMBERS && mappedValue?.channel_member_count > memberNotifyCount) {
                memberNotifyCount = mappedValue.channel_member_count;
                channelTimezoneCount = mappedValue.channel_member_timezones_count;
            }
            if (group.name) {
                groupMentionsSet.add(`@${group.name}`);
            }
        });
    return {groupMentionsSet, memberNotifyCount, channelTimezoneCount};
};

export function buildGroupMentionsMessage(intl: IntlShape, groupMentions: string[], memberNotifyCount: number, channelTimezoneCount: number) {
    let notifyAllMessage = '';

    if (groupMentions.length === 1) {
        if (channelTimezoneCount > 0) {
            notifyAllMessage = (
                intl.formatMessage(
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
                intl.formatMessage(
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
            intl.formatMessage(
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
            intl.formatMessage(
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

export function buildChannelWideMentionMessage(intl: IntlShape, membersCount: number, isTimezoneEnabled: boolean, channelTimezoneCount: number, atHere: boolean) {
    let notifyAllMessage = '';
    if (isTimezoneEnabled && channelTimezoneCount) {
        const msgID = atHere ? t('mobile.post_textbox.entire_channel_here.message.with_timezones') : t('mobile.post_textbox.entire_channel.message.with_timezones');
        const atHereMsg = 'By using @here you are about to send notifications up to {totalMembers, number} {totalMembers, plural, one {person} other {people}} in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?';
        const atAllOrChannelMsg = 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}} in {timezones, number} {timezones, plural, one {timezone} other {timezones}}. Are you sure you want to do this?';

        notifyAllMessage = (
            intl.formatMessage(
                {
                    id: msgID,
                    defaultMessage: atHere ? atHereMsg : atAllOrChannelMsg,
                },
                {
                    totalMembers: membersCount - 1,
                    timezones: channelTimezoneCount,
                },
            )
        );
    } else {
        const msgID = atHere ? t('mobile.post_textbox.entire_channel_here.message') : t('mobile.post_textbox.entire_channel.message');
        const atHereMsg = 'By using @here you are about to send notifications to up to {totalMembers, number} {totalMembers, plural, one {person} other {people}}. Are you sure you want to do this?';
        const atAllOrChannelMsg = 'By using @all or @channel you are about to send notifications to {totalMembers, number} {totalMembers, plural, one {person} other {people}}. Are you sure you want to do this?';

        notifyAllMessage = (
            intl.formatMessage(
                {
                    id: msgID,
                    defaultMessage: atHere ? atHereMsg : atAllOrChannelMsg,
                },
                {
                    totalMembers: membersCount - 1,
                },
            )
        );
    }

    return notifyAllMessage;
}

export function alertChannelWideMention(intl: IntlShape, notifyAllMessage: string, accept: AlertCallback, cancel: AlertCallback) {
    const message = intl.formatMessage({
        id: 'mobile.post_textbox.entire_channel.title',
        defaultMessage: 'Confirm sending notifications to entire channel',
    });
    alertMessage(intl, message, notifyAllMessage, accept, cancel);
}

export function alertSendToGroups(intl: IntlShape, notifyAllMessage: string, accept: AlertCallback, cancel: AlertCallback) {
    const message = intl.formatMessage({
        id: 'mobile.post_textbox.groups.title',
        defaultMessage: 'Confirm sending notifications to groups',
    });
    alertMessage(intl, message, notifyAllMessage, accept, cancel);
}

function alertMessage(intl: IntlShape, message: string, notifyAllMessage: string, accept: AlertCallback, cancel: AlertCallback) {
    Alert.alert(
        message,
        notifyAllMessage,
        [
            {
                text: intl.formatMessage({
                    id: 'mobile.post_textbox.entire_channel.cancel',
                    defaultMessage: 'Cancel',
                }),
                onPress: cancel,
            },
            {
                text: intl.formatMessage({
                    id: 'mobile.post_textbox.entire_channel.confirm',
                    defaultMessage: 'Confirm',
                }),
                onPress: accept,
            },
        ],
    );
}

export const getStatusFromSlashCommand = (message: string) => {
    const tokens = message.split(' ');
    const command = tokens[0]?.substring(1);
    return General.STATUS_COMMANDS.includes(command) ? command : '';
};

export function alertSlashCommandFailed(intl: IntlShape, error: string) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.commands.error_title',
            defaultMessage: 'Error Executing Command',
        }),
        error,
    );
}
