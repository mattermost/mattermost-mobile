// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

// groups: MM-41882 import {getChannelMemberCountsByGroup, getChannelTimezones} from '@actions/remote/channel';
import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import {setStatus} from '@actions/remote/user';
import {Events, Screens} from '@constants';
import {NOTIFY_ALL_MEMBERS} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import DraftUploadManager from '@init/draft_upload_manager';
import * as DraftUtils from '@utils/draft';
import {isReactionMatch} from '@utils/emoji/helpers';
import {preventDoubleTap} from '@utils/tap';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import CursorPositionHandler from '../cursor_position_handler';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;

    // From database
    currentUserId: string;
    enableConfirmNotificationsToChannel?: boolean;
    isTimezoneEnabled: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;

    // groups: MM-41882 useGroupMentions: boolean;
    // groups: MM-41882 groupsWithAllowReference: GroupModel[];
    customEmojis: CustomEmojiModel[];

    // DRAFT Handler
    value: string;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: (message: string) => void;
    addFiles: (file: FileInfo[]) => void;
    uploadFileError: React.ReactNode;
}

export default function SendHandler({
    testID,
    channelId,
    currentUserId,
    enableConfirmNotificationsToChannel,
    files,
    isTimezoneEnabled,
    maxMessageLength,
    membersCount = 0,
    rootId,
    useChannelMentions,
    userIsOutOfOffice,
    customEmojis,
    value,

    // groups: MM-41882 useGroupMentions,
    // groups: MM-41882 groupsWithAllowReference,
    clearDraft,
    updateValue,
    addFiles,
    uploadFileError,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);
    const [sendingMessage, setSendingMessage] = useState(false);

    // groups: MM-41882 const [channelMemberCountsByGroup, setChannelMemberCountsByGroup] = useState<ChannelMemberCountByGroup[]>([]);

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
        clearDraft();
        setSendingMessage(false);
    }, [serverUrl, rootId, clearDraft]);

    const doSubmitMessage = useCallback(() => {
        const postFiles = files.filter((f) => !f.failed);
        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            message: value,
        };

        createPost(serverUrl, post, postFiles);

        clearDraft();
        setSendingMessage(false);
        DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
    }, [files, currentUserId, channelId, rootId, value, clearDraft]);

    const showSendToAllOrChannelOrHereAlert = useCallback((calculatedMembersCount: number, atHere: boolean) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, Boolean(isTimezoneEnabled), channelTimezoneCount, atHere);
        const cancel = () => {
            setSendingMessage(false);
        };

        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessage, cancel);
    }, [intl, isTimezoneEnabled, channelTimezoneCount, doSubmitMessage]);

    // groups: MM-41882 const showSendToGroupsAlert = useCallback((groupMentions: string[], memberNotifyCount: number, calculatedChannelTimezoneCount: number) => {
    // groups: MM-41882     const notifyAllMessage = DraftUtils.buildGroupMentionsMessage(intl, groupMentions, memberNotifyCount, calculatedChannelTimezoneCount);
    // groups: MM-41882     const cancel = () => {
    // groups: MM-41882         setSendingMessage(false);
    // groups: MM-41882     };
    // groups: MM-41882
    // groups: MM-41882     DraftUtils.alertSendToGroups(intl, notifyAllMessage, doSubmitMessage, cancel);
    // groups: MM-41882 }, [intl, doSubmitMessage]);

    const sendCommand = useCallback(async () => {
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
            const errorMessage = typeof (error) === 'string' ? error : error.message;
            DraftUtils.alertSlashCommandFailed(intl, errorMessage);
            return;
        }

        clearDraft();

        // TODO Apps related https://mattermost.atlassian.net/browse/MM-41233
        // if (data?.form) {
        //     showAppForm(data.form, data.call, theme);
        // }

        if (data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [userIsOutOfOffice, currentUserId, intl, value, serverUrl, channelId, rootId]);

    const sendMessage = useCallback(() => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;

        // groups: MM-41882 const notificationsToGroups = enableConfirmNotificationsToChannel && useGroupMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);

        // groups: MM-41882 const groupMentions = (!toAllOrChannel && !toHere && notificationsToGroups) ? DraftUtils.groupsMentionedInText(groupsWithAllowReference, value) : [];

        if (value.indexOf('/') === 0) {
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel);

        // groups: MM-41882 } else if (groupMentions.length > 0) {
        // groups: MM-41882     const {
        // groups: MM-41882         groupMentionsSet,
        // groups: MM-41882         memberNotifyCount,
        // groups: MM-41882         channelTimezoneCount: calculatedChannelTimezoneCount,
        // groups: MM-41882     } = DraftUtils.mapGroupMentions(channelMemberCountsByGroup, groupMentions);
        // groups: MM-41882     if (memberNotifyCount > 0) {
        // groups: MM-41882         showSendToGroupsAlert(Array.from(groupMentionsSet), memberNotifyCount, calculatedChannelTimezoneCount);
        // groups: MM-41882     } else {
        // groups: MM-41882         doSubmitMessage();
        // groups: MM-41882     }
        } else {
            doSubmitMessage();
        }
    }, [
        enableConfirmNotificationsToChannel,
        useChannelMentions,

        // groups: MM-41882 useGroupMentions,
        value,

        // groups: MM-41882 groupsWithAllowReference,
        channelTimezoneCount,

        // groups: MM-41882 channelMemberCountsByGroup,
        sendCommand,
        showSendToAllOrChannelOrHereAlert,

        // groups: MM-41882 showSendToGroupsAlert,
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

    // groups: MM-41882 useEffect(() => {
    // groups: MM-41882     if (useGroupMentions) {
    // groups: MM-41882         getChannelMemberCountsByGroup(serverUrl, channelId, isTimezoneEnabled).then((resp) => {
    // groups: MM-41882             if (resp.error) {
    // groups: MM-41882                 return;
    // groups: MM-41882             }
    // groups: MM-41882
    // groups: MM-41882             const received = resp.channelMemberCountsByGroup || [];
    // groups: MM-41882             if (received.length || channelMemberCountsByGroup.length) {
    // groups: MM-41882                 setChannelMemberCountsByGroup(received);
    // groups: MM-41882             }
    // groups: MM-41882         });
    // groups: MM-41882     }
    // groups: MM-41882 }, [useGroupMentions, channelId, isTimezoneEnabled, channelMemberCountsByGroup.length]);

    useEffect(() => {
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [serverUrl, channelId]);

    return (
        <CursorPositionHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}

            // From draft handler
            value={value}
            files={files}
            clearDraft={clearDraft}
            updateValue={updateValue}
            addFiles={addFiles}
            uploadFileError={uploadFileError}

            // From send handler
            sendMessage={handleSendMessage}
            canSend={canSend()}
            maxMessageLength={maxMessageLength}
        />
    );
}
