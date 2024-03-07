// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {General} from '@constants';
import {MENTIONS_REGEX} from '@constants/autocomplete';
import {PostPriorityType} from '@constants/post';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {persistentNotificationsConfirmation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import SendAction from '../send_action';
import Typing from '../typing';
import Uploads from '../uploads';

import Header from './header';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';

type Props = {
    testID?: string;
    channelId: string;
    channelType?: ChannelType;
    channelName?: string;
    rootId?: string;
    currentUserId: string;
    canShowPostPriority?: boolean;

    // Post Props
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
    persistentNotificationInterval: number;
    persistentNotificationMaxRecipients: number;

    // Cursor Position Handler
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    cursorPosition: number;

    // Send Handler
    sendMessage: () => void;
    canSend: boolean;
    maxMessageLength: number;

    // Draft Handler
    files: FileInfo[];
    value: string;
    uploadFileError: React.ReactNode;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    addFiles: (files: FileInfo[]) => void;
    updatePostInputTop: (top: number) => void;
    setIsFocused: (isFocused: boolean) => void;
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        actionsContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: Platform.select({
                ios: 1,
                android: 2,
            }),
        },
        inputContainer: {
            flex: 1,
            flexDirection: 'column',
        },
        inputContentContainer: {
            alignItems: 'stretch',
            paddingTop: Platform.select({
                ios: 7,
                android: 0,
            }),
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            justifyContent: 'center',
            paddingBottom: 2,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.20),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
        },
        postPriorityLabel: {
            marginLeft: 12,
            marginTop: Platform.select({
                ios: 3,
                android: 10,
            }),
        },
    };
});

export default function DraftInput({
    testID,
    channelId,
    channelType,
    channelName,
    currentUserId,
    canShowPostPriority,
    files,
    maxMessageLength,
    rootId = '',
    value,
    uploadFileError,
    sendMessage,
    canSend,
    updateValue,
    addFiles,
    updateCursorPosition,
    cursorPosition,
    updatePostInputTop,
    postPriority,
    updatePostPriority,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    setIsFocused,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    const inputRef = useRef<PasteInputRef>();
    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const persistentNotificationsEnabled = postPriority.persistent_notifications && postPriority.priority === PostPriorityType.URGENT;
    const {noMentionsError, mentionsList} = useMemo(() => {
        let error = false;
        let mentions: string[] = [];
        if (
            channelType !== General.DM_CHANNEL &&
            persistentNotificationsEnabled
        ) {
            mentions = (value.match(MENTIONS_REGEX) || []);
            error = mentions.length === 0;
        }

        return {noMentionsError: error, mentionsList: mentions};
    }, [channelType, persistentNotificationsEnabled, value]);

    const handleSendMessage = useCallback(async () => {
        if (persistentNotificationsEnabled) {
            persistentNotificationsConfirmation(serverUrl, value, mentionsList, intl, sendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType);
        } else {
            sendMessage();
        }
    }, [serverUrl, mentionsList, persistentNotificationsEnabled, persistentNotificationMaxRecipients, sendMessage, value, channelType]);

    const sendActionDisabled = !canSend || noMentionsError;

    return (
        <>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            <SafeAreaView
                edges={SAFE_AREA_VIEW_EDGES}
                onLayout={handleLayout}
                style={style.inputWrapper}
                testID={testID}
            >

                <ScrollView
                    style={style.inputContainer}
                    contentContainerStyle={style.inputContentContainer}
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    pinchGestureEnabled={false}
                    overScrollMode={'never'}
                    disableScrollViewPanResponder={true}
                >
                    <Header
                        noMentionsError={noMentionsError}
                        postPriority={postPriority}
                    />
                    <PostInput
                        testID={postInputTestID}
                        channelId={channelId}
                        maxMessageLength={maxMessageLength}
                        rootId={rootId}
                        cursorPosition={cursorPosition}
                        updateCursorPosition={updateCursorPosition}
                        updateValue={updateValue}
                        value={value}
                        addFiles={addFiles}
                        sendMessage={handleSendMessage}
                        inputRef={inputRef}
                        setIsFocused={setIsFocused}
                    />
                    <Uploads
                        currentUserId={currentUserId}
                        files={files}
                        uploadFileError={uploadFileError}
                        channelId={channelId}
                        rootId={rootId}
                    />
                    <View style={style.actionsContainer}>
                        <QuickActions
                            testID={quickActionsTestID}
                            fileCount={files.length}
                            addFiles={addFiles}
                            updateValue={updateValue}
                            value={value}
                            postPriority={postPriority}
                            updatePostPriority={updatePostPriority}
                            canShowPostPriority={canShowPostPriority}
                            focus={focus}
                        />
                        <SendAction
                            testID={sendActionTestID}
                            disabled={sendActionDisabled}
                            sendMessage={handleSendMessage}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
