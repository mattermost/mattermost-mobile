// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {updateDraftPriority} from '@actions/local/draft';
import {useHandleSendMessage} from '@app/hooks/handle_send_message';
import {PostPriorityType} from '@constants/post';
import {useServerUrl} from '@context/server';

import DraftInput from '../draft_input';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    testID?: string;
    channelId: string;
    channelType?: ChannelType;
    channelName?: string;
    rootId: string;
    canShowPostPriority?: boolean;
    setIsFocused: (isFocused: boolean) => void;

    // From database
    currentUserId: string;
    cursorPosition: number;
    enableConfirmNotificationsToChannel?: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;
    customEmojis: CustomEmojiModel[];

    // DRAFT Handler
    value: string;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    updatePostInputTop: (top: number) => void;
    addFiles: (file: FileInfo[]) => void;
    uploadFileError: React.ReactNode;
    persistentNotificationInterval: number;
    persistentNotificationMaxRecipients: number;
    postPriority: PostPriority;
}

export const INITIAL_PRIORITY = {
    priority: PostPriorityType.STANDARD,
    requested_ack: false,
    persistent_notifications: false,
};

export default function SendHandler({
    testID,
    channelId,
    channelType,
    channelName,
    currentUserId,
    enableConfirmNotificationsToChannel,
    files,
    maxMessageLength,
    membersCount = 0,
    cursorPosition,
    rootId,
    canShowPostPriority,
    useChannelMentions,
    userIsOutOfOffice,
    customEmojis,
    value,
    clearDraft,
    updateValue,
    addFiles,
    uploadFileError,
    updateCursorPosition,
    updatePostInputTop,
    setIsFocused,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    postPriority,
}: Props) {
    const serverUrl = useServerUrl();

    const handlePostPriority = useCallback((priority: PostPriority) => {
        updateDraftPriority(serverUrl, channelId, rootId, priority);
    }, [serverUrl, channelId, rootId]);

    const {handleSendMessage, canSend} = useHandleSendMessage({
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

    return (
        <DraftInput
            testID={testID}
            channelId={channelId}
            channelType={channelType}
            channelName={channelName}
            currentUserId={currentUserId}
            rootId={rootId}
            canShowPostPriority={canShowPostPriority}
            cursorPosition={cursorPosition}
            updateCursorPosition={updateCursorPosition}
            value={value}
            files={files}
            updateValue={updateValue}
            addFiles={addFiles}
            uploadFileError={uploadFileError}
            sendMessage={handleSendMessage}
            canSend={canSend}
            maxMessageLength={maxMessageLength}
            updatePostInputTop={updatePostInputTop}
            postPriority={postPriority}
            updatePostPriority={handlePostPriority}
            persistentNotificationInterval={persistentNotificationInterval}
            persistentNotificationMaxRecipients={persistentNotificationMaxRecipients}
            setIsFocused={setIsFocused}
        />
    );
}
