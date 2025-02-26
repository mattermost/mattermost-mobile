// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {useIntl} from 'react-intl';

import {removeDraft} from '@actions/local/draft';
import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {ICON_SIZE} from '@constants/post_draft';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl, withServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useHandleSendMessage} from '@hooks/handle_send_message';
import {usePersistentNotificationProps} from '@hooks/persistent_notification_props';
import websocket_manager from '@managers/websocket_manager';
import {DRAFT_TYPE_DRAFT, type DraftType} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {persistentNotificationsConfirmation, sendMessageWithAlert} from '@utils/post';
import {showSnackBar} from '@utils/snack_bar';
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
    websocketState: WebsocketConnectedState;
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

export const SendDraft: React.FC<Props> = ({
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
    websocketState,
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
                showSnackBar({
                    barType: SNACK_BAR_TYPE.DELETE_SCHEDULED_POST_ERROR,
                    customMessage: (res.error as Error).message,
                    keepOpen: true,
                    type: 'error',
                });
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
        clearDraft,
    });

    const draftSendHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
        if (websocketState !== 'connected') {
            showSnackBar({
                barType: SNACK_BAR_TYPE.CONNECTION_ERROR,
                customMessage: intl.formatMessage({id: 'network_connection.not_connected', defaultMessage: 'No internet connection'}),
                type: 'error',
                keepOpen: true,
            });
            return;
        }
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

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: websocket_manager.observeWebsocketState(serverUrl),
}));

export default withServerUrl(enhanced(SendDraft));
