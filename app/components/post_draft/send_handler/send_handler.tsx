// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {addRecentReaction} from '@actions/local/reactions';
import {getChannelMemberCountsByGroup, getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {addReactionToLatestPost} from '@actions/remote/reactions';
import {setStatus} from '@actions/remote/user';
import {IS_REACTION_REGEX} from '@constants/post_draft';
import {NOTIFY_ALL_MEMBERS} from '@constants/view';
import {useServerUrl} from '@context/server_url';
import EphemeralStore from '@store/ephemeral_store';
import * as DraftUtils from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import CursorPositionHandler from '../cursor_position_handler';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;
    screenId: string;

    // From database
    currentUserId: string;
    enableConfirmNotificationsToChannel?: boolean;
    isTimezoneEnabled: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;
    useGroupMentions: boolean;
    groupsWithAllowReference: Group[];

    // DRAFT Handler
    value: string;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: (message: string) => void;
    addFiles: (file: FileInfo[]) => void;
    removeFiles: (file: FileInfo) => void;
    retryFileUpload: (file: FileInfo) => void;
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
    screenId,
    useChannelMentions,
    userIsOutOfOffice,
    value,
    useGroupMentions,
    groupsWithAllowReference,
    clearDraft,
    updateValue,
    addFiles,
    removeFiles,
    retryFileUpload,
    uploadFileError,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [channelMemberCountsByGroup, setChannelMemberCountsByGroup] = useState<ChannelMemberCountByGroup[]>([]);

    useEffect(() => {
        if (useGroupMentions) {
            getChannelMemberCountsByGroup(serverUrl, channelId, isTimezoneEnabled).then((resp) => {
                if (resp.error) {
                    return;
                }

                const received = resp.channelMemberCountsByGroup || [];
                if (received.length || channelMemberCountsByGroup.length) {
                    setChannelMemberCountsByGroup(received);
                }
            });
        }
    }, [useGroupMentions, channelId, isTimezoneEnabled, channelMemberCountsByGroup.length]);

    useEffect(() => {
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [channelId]);

    const canSend = () => {
        if (sendingMessage) {
            return false;
        }

        const messageLength = value.trim().length;

        if (messageLength > maxMessageLength) {
            return false;
        }

        if (files.length) {
            const loadingComplete = !files.some((file) => file.loading);
            return loadingComplete;
        }

        return messageLength > 0;
    };

    const handleSendMessage = preventDoubleTap(() => {
        if (!canSend()) {
            return;
        }

        setSendingMessage(true);
        updateValue('');

        const isReactionMatch = value.match(IS_REACTION_REGEX);
        if (isReactionMatch) {
            const emoji = isReactionMatch[2];
            sendReaction(emoji);
            return;
        }

        const hasFailedAttachments = files.some((f) => f.failed);
        if (hasFailedAttachments) {
            const cancel = () => {
                updateValue(value);
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
    });

    const sendReaction = (emoji: string) => {
        addReactionToLatestPost(emoji, rootId);
        setSendingMessage(false);
    };

    const sendCommand = async () => {
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
            updateValue(value);
            const errorMessage = typeof (error) === 'string' ? error : error.message;
            DraftUtils.alertSlashCommandFailed(intl, errorMessage);
            return;
        }

        // TODO Apps related
        // if (data?.form) {
        //     showAppForm(data.form, data.call, theme);
        // }

        if (data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    };

    const sendMessage = () => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const notificationsToGroups = enableConfirmNotificationsToChannel && useGroupMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);
        const groupMentions = (!toAllOrChannel && !toHere && notificationsToGroups) ? DraftUtils.groupsMentionedInText(groupsWithAllowReference, value) : [];

        if (value.indexOf('/') === 0) {
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel);
        } else if (groupMentions.length > 0) {
            const {
                groupMentionsSet,
                memberNotifyCount,
                channelTimezoneCount: calculatedChannelTimezoneCount,
            } = DraftUtils.mapGroupMentions(channelMemberCountsByGroup, groupMentions);
            if (memberNotifyCount > 0) {
                showSendToGroupsAlert(Array.from(groupMentionsSet), memberNotifyCount, calculatedChannelTimezoneCount);
            } else {
                doSubmitMessage();
            }
        } else {
            doSubmitMessage();
        }
    };

    const doSubmitMessage = () => {
        const postFiles = files.filter((f) => !f.failed);
        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            message: value,
        };

        createPost(serverUrl, post, postFiles).then(({data}) => {
            if (data) {
                addRecentReaction(serverUrl, value);
            }
        });

        clearDraft();
        setSendingMessage(false);

        // if (Platform.OS === 'android') {
        //     // Fixes the issue where Android predictive text would prepend suggestions to the post draft when messages
        //     // are typed successively without blurring the input
        //     const nextState = {
        //         keyboardType: 'email-address',
        //     };

        //     const callback = () => this.setState({keyboardType: 'default'});

        //     this.setState(nextState, callback);
        // }

        DeviceEventEmitter.emit('scroll-to-bottom', EphemeralStore.getNavigationTopComponentId());
    };

    const showSendToAllOrChannelOrHereAlert = (calculatedMembersCount: number, atHere: boolean) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, Boolean(isTimezoneEnabled), channelTimezoneCount, atHere);
        const cancel = () => {
            updateValue(value);
            setSendingMessage(false);
        };

        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessage, cancel);
    };

    const showSendToGroupsAlert = (groupMentions: string[], memberNotifyCount: number, calculatedChannelTimezoneCount: number) => {
        const notifyAllMessage = DraftUtils.buildGroupMentionsMessage(intl, groupMentions, memberNotifyCount, calculatedChannelTimezoneCount);
        const cancel = () => {
            updateValue(value);
            setSendingMessage(false);
        };

        DraftUtils.alertSendToGroups(intl, notifyAllMessage, doSubmitMessage, cancel);
    };

    return (
        <CursorPositionHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}
            screenId={screenId}

            value={value}
            files={files}
            clearDraft={clearDraft}
            updateValue={updateValue}
            addFiles={addFiles}
            removeFile={removeFiles}
            retryFileUpload={retryFileUpload}
            uploadFileError={uploadFileError}

            sendMessage={handleSendMessage}
            canSend={canSend()}
            maxMessageLength={maxMessageLength}
        />
    );
}
