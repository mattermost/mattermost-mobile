// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, type AlertButton} from 'react-native';
import {type SwipeableMethods} from 'react-native-gesture-handler/ReanimatedSwipeable';

import {parseMarkdownImages, removeDraft, updateDraftMarkdownImageMetadata, updateDraftMessage} from '@actions/local/draft';
import {General} from '@constants';
import {CODE_REGEX} from '@constants/autocomplete';
import {t} from '@i18n';

import type {IntlShape, MessageDescriptor} from 'react-intl';

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

export function buildChannelWideMentionMessage(intl: IntlShape, membersCount: number, channelTimezoneCount: number, atHere: boolean) {
    let notifyAllMessage = '';
    if (channelTimezoneCount) {
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

export const handleDraftUpdate = async ({
    serverUrl,
    channelId,
    rootId,
    value,
}: {
    serverUrl: string;
    channelId: string;
    rootId: string;
    value: string;
}) => {
    await updateDraftMessage(serverUrl, channelId, rootId, value);
    const imageMetadata: Dictionary<PostImage | undefined> = {};
    await parseMarkdownImages(value, imageMetadata);

    if (Object.keys(imageMetadata).length !== 0) {
        updateDraftMarkdownImageMetadata({serverUrl, channelId, rootId, imageMetadata});
    }
};

export function deleteDraftConfirmation({intl, serverUrl, channelId, rootId, swipeable}: {
    intl: IntlShape;
    serverUrl: string;
    channelId: string;
    rootId: string;
    swipeable?: React.RefObject<SwipeableMethods>;
}) {
    const deleteDraft = async () => {
        removeDraft(serverUrl, channelId, rootId);
    };

    const onDismiss = () => {
        if (swipeable?.current) {
            swipeable.current.close();
        }
    };

    Alert.alert(
        intl.formatMessage({
            id: 'draft.options.delete.title',
            defaultMessage: 'Delete draft',
        }),
        intl.formatMessage({
            id: 'draft.options.delete.confirmation',
            defaultMessage: 'Are you sure you want to delete this draft?',
        }),
        [
            {
                text: intl.formatMessage({
                    id: 'draft.options.delete.cancel',
                    defaultMessage: 'Cancel',
                }),
                style: 'cancel',
                onPress: onDismiss,
            },
            {
                text: intl.formatMessage({
                    id: 'draft.options.delete.confirm',
                    defaultMessage: 'Delete',
                }),
                onPress: deleteDraft,
            },
        ],
    );
}
