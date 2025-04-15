// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {removeDraft} from '@actions/local/draft';
import {updateScheduledPostErrorCode} from '@actions/local/scheduled_post';
import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {DRAFT_TYPE_DRAFT, type DraftType} from '@constants/draft';
import {ICON_SIZE} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useHandleSendMessage} from '@hooks/handle_send_message';
import {usePersistentNotificationProps} from '@hooks/persistent_notification_props';
import {dismissBottomSheet} from '@screens/navigation';
import {logError} from '@utils/log';
import {persistentNotificationsConfirmation, sendMessageWithAlert} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    rootId: string;
    draftType?: DraftType;
    channelType: ChannelType | undefined;
    currentUserId: string;
    channelName: string | undefined;
    channelDisplayName?: string;
    enableConfirmNotificationsToChannel?: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;
    customEmojis: CustomEmojiModel[];
    bottomSheetId?: AvailableScreens;
    value: string;
    files: FileInfo[];
    postPriority: PostPriority;
    persistentNotificationInterval: number;
    persistentNotificationMaxRecipients: number;
    draftReceiverUserName?: string;
    postId?: string;
    canPost?: boolean;
    channelIsArchived?: boolean;
    channelIsReadOnly?: boolean;
    deactivatedChannel?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    draftOptions: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
    disabled: {
        color: 'red',
    },
}));

const SendDraft: React.FC<Props> = ({
    channelId,
    channelName,
    channelDisplayName,
    rootId,
    draftType,
    postId,
    channelType,
    bottomSheetId,
    currentUserId,
    enableConfirmNotificationsToChannel,
    maxMessageLength,
    membersCount = 0,
    useChannelMentions,
    userIsOutOfOffice,
    customEmojis,
    value,
    files,
    postPriority,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    draftReceiverUserName,
    canPost,
    channelIsArchived,
    channelIsReadOnly,
    deactivatedChannel,
}) => {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const clearDraft = async () => {
        if (draftType === DRAFT_TYPE_DRAFT) {
            removeDraft(serverUrl, channelId, rootId);
            return;
        }
        if (postId) {
            const res = await deleteScheduledPost(serverUrl, postId);
            if (res?.error) {
                try {
                    await updateScheduledPostErrorCode(serverUrl, postId, 'post_send_success_delete_failed');
                } catch {
                    logError('Fail to update scheduled post error code');
                }
                Alert.alert(
                    intl.formatMessage({id: 'scheduled_post.delete_fails', defaultMessage: 'Delete fails'}),
                    intl.formatMessage({
                        id: 'scheduled_post.delete_fails.message',
                        defaultMessage: 'Post has been create successfully but failed to delete. Please delete the scheduled post manually from the scheduled post list.',
                    }),
                    [{
                        text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                        style: 'cancel',
                    },
                    ], {cancelable: false},
                );
            }
        }
    };

    const {persistentNotificationsEnabled, mentionsList} = usePersistentNotificationProps({
        value,
        channelType,
        postPriority,
    });

    const {handleSendMessage} = useHandleSendMessage({
        value,
        channelId,
        rootId,
        files,
        maxMessageLength,
        customEmojis,
        enableConfirmNotificationsToChannel,
        useChannelMentions,
        membersCount,
        userIsOutOfOffice,
        currentUserId,
        channelType,
        postPriority,
        isFromDraftView: true,
        canPost,
        channelIsArchived,
        channelIsReadOnly,
        deactivatedChannel,
        clearDraft,
    });

    const draftSendHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
        if (persistentNotificationsEnabled) {
            persistentNotificationsConfirmation(serverUrl, value, mentionsList, intl, handleSendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType);
        } else {
            let receivingChannel = channelName;
            switch (channelType) {
                case General.DM_CHANNEL:
                    receivingChannel = draftReceiverUserName;
                    break;
                case General.GM_CHANNEL:
                    receivingChannel = channelDisplayName;
                    break;
                default:
                    receivingChannel = channelName;
                    break;
            }
            sendMessageWithAlert({
                title: intl.formatMessage({
                    id: 'send_message.confirm.title',
                    defaultMessage: 'Send message now',
                }),
                intl,
                channelName: receivingChannel || '',
                sendMessageHandler: handleSendMessage,
            });
        }
    };

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={[style.draftOptions]}
            onPress={draftSendHandler}
            testID='send_draft_button'
        >
            <CompassIcon
                name='send'
                size={ICON_SIZE}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
            {draftType === DRAFT_TYPE_DRAFT ? (
                <FormattedText
                    id='draft.options.send.title'
                    defaultMessage='Send draft'
                    style={style.title}
                />
            ) : (
                <FormattedText
                    id='scheduled_post.options.send.title'
                    defaultMessage='Send'
                    style={style.title}
                />
            )
            }
        </TouchableWithFeedback>
    );
};

export default SendDraft;
