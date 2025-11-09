// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import {createScheduledPost} from '@actions/remote/scheduled_post';
import {setStatus} from '@actions/remote/user';
import {handleCallsSlashCommand} from '@calls/actions';
import {Events, Screens} from '@constants';
import {NOTIFY_ALL_MEMBERS} from '@constants/post_draft';
import {MESSAGE_TYPE, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import DraftUploadManager from '@managers/draft_upload_manager';
import {queryAllUsers, getTeammateNameDisplay, getCurrentUser} from '@queries/servers/user';
import * as DraftUtils from '@utils/draft';
import {isReactionMatch} from '@utils/emoji/helpers';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {scheduledPostFromPost} from '@utils/post';
import {canPostDraftInChannelOrThread} from '@utils/scheduled_post';
import {showSnackBar} from '@utils/snack_bar';
import {confirmOutOfOfficeDisabled, displayUsername} from '@utils/user';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

export type CreateResponse = {
    data?: boolean;
    error?: unknown;
    response?: Post | ScheduledPost;
}

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
    isFromDraftView?: boolean;
    clearDraft: () => void;
    canPost?: boolean;
    channelIsArchived?: boolean;
    channelIsReadOnly?: boolean;
    deactivatedChannel?: boolean;
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
    isFromDraftView,
    canPost,
    channelIsArchived,
    channelIsReadOnly,
    deactivatedChannel,
    clearDraft,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [sendingMessage, setSendingMessage] = useState(false);
    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);

    const canSend = useMemo(() => {
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

    const doSubmitMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
        const postFiles = files.filter((f) => !f.failed);

        // ============================================================================
        // FEATURE: Display Name to Username Conversion for Mentions
        // ============================================================================
        // This section converts display names (e.g., "@John Doe") back to usernames
        // (e.g., "@john.doe") before sending the post to the server.
        //
        // WHY: When "Teammate Name Display" is set to "Show first and last name",
        //      users see full names in the text field when selecting mentions from
        //      autocomplete. However, the server requires usernames for proper
        //      mention parsing and notifications. This conversion ensures:
        //      1. Users see friendly display names in the UI
        //      2. Server receives correct usernames for processing
        //      3. Notifications and mentions work correctly
        //
        // HOW IT WORKS:
        // 1. Build a reverse mapping of display names -> usernames for all users
        // 2. Only map users whose display name differs from username and contains spaces
        // 3. Escape special regex characters in display names for safe pattern matching
        // 4. Sort display names by length (longest first) to handle nested names
        // 5. Replace @displayName patterns with @username in the message
        //
        // RELATED CHANGES:
        // - at_mention_item/index.tsx: Modified to insert display names in text field
        // - This file: Converts display names to usernames before server submission
        // ============================================================================
        let message = value;

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const users = await queryAllUsers(database).fetch();
            const currentUser = await getCurrentUser(database);
            const teammateNameDisplay = await getTeammateNameDisplay(database);
            const locale = currentUser?.locale || intl.locale;

            // Create a reverse mapping: display name -> username
            // This map will be used to convert display names back to usernames
            const displayNameToUsername = new Map<string, string>();

            for (const user of users) {
                const displayName = displayUsername(user, locale, teammateNameDisplay, false);

                // Only map if display name is different from username and has spaces (full name)
                // This ensures we only convert actual full names, not usernames that happen to match
                if (displayName !== user.username && displayName.includes(' ')) {
                    // Escape special regex characters in display name to prevent regex injection
                    // Characters like . * + ? ^ $ { } ( ) | [ ] \ need to be escaped
                    const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    displayNameToUsername.set(escapedDisplayName, user.username);
                }
            }

            // Replace @displayName with @username in the message
            if (displayNameToUsername.size > 0) {
                // Sort by length (longest first) to handle cases where one display name contains another
                // Example: "John Doe" and "John Doe Jr" - we want to match "John Doe Jr" first
                const sortedDisplayNames = Array.from(displayNameToUsername.keys()).sort((a, b) => b.length - a.length);

                for (const displayName of sortedDisplayNames) {
                    const username = displayNameToUsername.get(displayName)!;

                    // Match @displayName with word boundaries, handling spaces
                    // Pattern: @displayName followed by whitespace, end of string, or non-word character
                    // This ensures we match complete names, not partial matches
                    const regex = new RegExp(`@${displayName}(?=\\s|$|[^\\w\\s-])`, 'g');
                    message = message.replace(regex, `@${username}`);
                }
            }
        } catch (error) {
            // If conversion fails, use original message
            // This ensures the message is still sent even if conversion fails
            logError(error, 'Failed to convert display names to usernames');
        }

        // ============================================================================
        // END OF DISPLAY NAME TO USERNAME CONVERSION
        // ============================================================================

        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            message, // ← Now uses converted message
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

        let response: CreateResponse;
        if (schedulingInfo) {
            response = await createScheduledPost(serverUrl, scheduledPostFromPost(post, schedulingInfo, postPriority, postFiles));
            if (response.error) {
                showSnackBar({
                    barType: SNACK_BAR_TYPE.SCHEDULED_POST_CREATION_ERROR,
                    customMessage: getErrorMessage(response.error),
                    type: MESSAGE_TYPE.ERROR,
                });
            } else {
                clearDraft();
            }
        } else if (isFromDraftView) {
            const shouldClearDraft = await canPostDraftInChannelOrThread({
                serverUrl,
                rootId,
                intl,
                canPost,
                channelIsArchived,
                channelIsReadOnly,
                deactivatedChannel,
            });

            if (!shouldClearDraft) {
                return;
            }

            createPost(serverUrl, post, postFiles);
            clearDraft();

            // Early return to avoid calling DeviceEventEmitter.emit
            return;
        } else {
            // Response error is handled at the post level so don't have to wait to clear draft
            createPost(serverUrl, post, postFiles);
            clearDraft();
        }

        setSendingMessage(false);
        DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
    }, [files, currentUserId, channelId, rootId, value, postPriority, isFromDraftView, serverUrl, intl, canPost, channelIsArchived, channelIsReadOnly, deactivatedChannel, clearDraft]);

    const showSendToAllOrChannelOrHereAlert = useCallback((calculatedMembersCount: number, atHere: boolean, schedulingInfo?: SchedulingInfo) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, channelTimezoneCount, atHere);
        const cancel = () => {
            setSendingMessage(false);
        };

        // Creating a wrapper function to pass the schedulingInfo to the doSubmitMessage function as the accepted
        // function signature causes conflict.
        // TODO for later - change alert message if this is a scheduled post
        const doSubmitMessageScheduledPostWrapper = () => doSubmitMessage(schedulingInfo);
        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessageScheduledPostWrapper, cancel);
    }, [intl, channelTimezoneCount, doSubmitMessage]);

    const sendCommand = useCallback(async () => {
        if (value.trim().startsWith('/call')) {
            const {handled, error} = await handleCallsSlashCommand(value.trim(), serverUrl, channelId, channelType ?? '', rootId, currentUserId, intl);
            if (handled) {
                setSendingMessage(false);
                clearDraft();
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

        clearDraft();

        if (data?.goto_location && !value.startsWith('/leave')) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [value, userIsOutOfOffice, serverUrl, intl, channelId, rootId, clearDraft, channelType, currentUserId]);

    const sendMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);

        if (value.indexOf('/') === 0 && !schedulingInfo) {
            // Don't execute slash command when scheduling message
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel, schedulingInfo);
        } else {
            return doSubmitMessage(schedulingInfo);
        }

        return Promise.resolve();
    }, [enableConfirmNotificationsToChannel, useChannelMentions, value, membersCount, sendCommand, showSendToAllOrChannelOrHereAlert, doSubmitMessage]);

    const handleSendMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
        if (!canSend) {
            return Promise.resolve();
        }

        setSendingMessage(true);

        const match = isReactionMatch(value, customEmojis);
        if (match && !files.length) {
            handleReaction(match.emoji, match.add);
            return Promise.resolve();
        }

        const hasFailedAttachments = files.some((f) => f.failed);
        if (hasFailedAttachments) {
            const cancel = () => {
                setSendingMessage(false);
            };
            const accept = () => {
                // Files are filtered on doSubmitMessage
                sendMessage(schedulingInfo);
            };

            DraftUtils.alertAttachmentFail(intl, accept, cancel);
        } else {
            return sendMessage(schedulingInfo);
        }

        return Promise.resolve();
    }, [canSend, value, customEmojis, files, handleReaction, intl, sendMessage]);

    useEffect(() => {
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [serverUrl, channelId]);

    return {
        handleSendMessage,
        canSend,
    };
};
