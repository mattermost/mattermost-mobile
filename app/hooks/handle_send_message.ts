// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import {setStatus} from '@actions/remote/user';
import {Events, Screens} from '@app/constants';
import {NOTIFY_ALL_MEMBERS} from '@app/constants/post_draft';
import {useServerUrl} from '@app/context/server';
import {handleCallsSlashCommand} from '@app/products/calls/actions';
import {isReactionMatch} from '@app/utils/emoji/helpers';
import {getFullErrorMessage} from '@app/utils/errors';
import {preventDoubleTap} from '@app/utils/tap';
import {confirmOutOfOfficeDisabled} from '@app/utils/user';
import DraftUploadManager from '@managers/draft_upload_manager';
import * as DraftUtils from '@utils/draft';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    value: string;
    channelId: string;
    rootId: string;
    maxMessageLength: number;
    files: FileInfo[];
    customEmojis: CustomEmojiModel[];
    enableConfirmNotificationsToChannel?: boolean;
    useChannelMentions: boolean;
    membersCount: number;
    userIsOutOfOffice: boolean;
    currentUserId: string;
    channelType: ChannelType | undefined;
    postPriority: PostPriority;
    clearDraft?: () => void;
}

export const useHandleSendMessage = ({
    value,
    channelId,
    rootId,
    files,
    maxMessageLength,
    customEmojis,
    enableConfirmNotificationsToChannel,
    useChannelMentions,
    membersCount = 0,
    userIsOutOfOffice,
    currentUserId,
    channelType,
    postPriority,
    clearDraft,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [sendingMessage, setSendingMessage] = useState(false);
    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);

    const canSend = useCallback(() => {
        if (sendingMessage) {
            return false;
        }

        const messageLength = value.trim().length;

        if (messageLength > maxMessageLength) {
            return false;
        }

        if (files.length) {
            const loadingComplete = !files.some((file) => DraftUploadManager.isUploading(file.clientId!));
            return loadingComplete;
        }

        return messageLength > 0;
    }, [sendingMessage, value, files, maxMessageLength]);

    const handleReaction = useCallback((emoji: string, add: boolean) => {
        handleReactionToLatestPost(serverUrl, emoji, add, rootId);
        clearDraft?.();
        setSendingMessage(false);
    }, [serverUrl, rootId, clearDraft]);

    const doSubmitMessage = useCallback(() => {
        const postFiles = files.filter((f) => !f.failed);
        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            message: value,
        } as Post;

        if (!rootId && (
            postPriority.priority ||
            postPriority.requested_ack ||
            postPriority.persistent_notifications)
        ) {
            post.metadata = {
                priority: postPriority,
            };
        }

        createPost(serverUrl, post, postFiles);

        clearDraft?.();
        setSendingMessage(false);
        DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
    }, [files, currentUserId, channelId, rootId, value, clearDraft, postPriority]);

    const showSendToAllOrChannelOrHereAlert = useCallback((calculatedMembersCount: number, atHere: boolean) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, channelTimezoneCount, atHere);
        const cancel = () => {
            setSendingMessage(false);
        };

        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessage, cancel);
    }, [intl, channelTimezoneCount, doSubmitMessage]);

    const sendCommand = useCallback(async () => {
        if (value.trim().startsWith('/call')) {
            const {handled, error} = await handleCallsSlashCommand(value.trim(), serverUrl, channelId, channelType ?? '', rootId, currentUserId, intl);
            if (handled) {
                setSendingMessage(false);
                clearDraft?.();
                return;
            }
            if (error) {
                setSendingMessage(false);
                DraftUtils.alertSlashCommandFailed(intl, error);
                return;
            }
        }

        const status = DraftUtils.getStatusFromSlashCommand(value);
        if (userIsOutOfOffice && status) {
            const updateStatus = (newStatus: string) => {
                setStatus(serverUrl, {
                    status: newStatus,
                    last_activity_at: Date.now(),
                    manual: true,
                    user_id: currentUserId,
                });
            };
            confirmOutOfOfficeDisabled(intl, status, updateStatus);
            setSendingMessage(false);
            return;
        }

        const {data, error} = await executeCommand(serverUrl, intl, value, channelId, rootId);
        setSendingMessage(false);

        if (error) {
            const errorMessage = getFullErrorMessage(error);
            DraftUtils.alertSlashCommandFailed(intl, errorMessage);
            return;
        }

        clearDraft?.();

        if (data?.goto_location && !value.startsWith('/leave')) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [userIsOutOfOffice, currentUserId, intl, value, serverUrl, channelId, rootId]);

    const sendMessage = useCallback(() => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);

        if (value.indexOf('/') === 0) {
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel);
        } else {
            doSubmitMessage();
        }
    }, [
        enableConfirmNotificationsToChannel,
        useChannelMentions,
        value,
        channelTimezoneCount,
        sendCommand,
        showSendToAllOrChannelOrHereAlert,
        doSubmitMessage,
    ]);

    const handleSendMessage = useCallback(preventDoubleTap(() => {
        if (!canSend()) {
            return;
        }

        setSendingMessage(true);

        const match = isReactionMatch(value, customEmojis);
        if (match && !files.length) {
            handleReaction(match.emoji, match.add);
            return;
        }

        const hasFailedAttachments = files.some((f) => f.failed);
        if (hasFailedAttachments) {
            const cancel = () => {
                setSendingMessage(false);
            };
            const accept = () => {
                // Files are filtered on doSubmitMessage
                sendMessage();
            };

            DraftUtils.alertAttachmentFail(intl, accept, cancel);
        } else {
            sendMessage();
        }
    }), [canSend, value, handleReaction, files, sendMessage, customEmojis]);

    useEffect(() => {
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [serverUrl, channelId]);

    return {
        handleSendMessage,
        canSend: canSend(),
    };
};
