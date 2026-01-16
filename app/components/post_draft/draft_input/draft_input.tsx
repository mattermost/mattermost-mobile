// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import {runOnJS, useAnimatedReaction} from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {isAndroidEdgeToEdge} from '@constants/device';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePersistentNotificationProps} from '@hooks/persistent_notification_props';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {useCurrentScreen} from '@store/navigation_store';
import {persistentNotificationsConfirmation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import SendAction from '../send_button';
import Typing from '../typing';
import Uploads from '../uploads';

import Header from './header';

export type Props = {
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
    sendMessage: (schedulingInfo?: SchedulingInfo) => Promise<void | {data?: boolean; error?: unknown}>;
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
    scheduledPostsEnabled: boolean;
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

function DraftInput({
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
    scheduledPostsEnabled,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const currentScreen = useCurrentScreen();
    const [layoutHeight, setLayoutHeight] = React.useState(0);
    const {bottom} = useSafeAreaInsets();

    const {inputRef, focusInput: focus, keyboardHeight} = useKeyboardAnimationContext();

    const edges = useMemo<Edge[]>(() => {
        if (isTablet && currentScreen === Screens.CHANNEL_LIST) {
            return ['left', 'right'];
        }

        return SAFE_AREA_VIEW_EDGES;
    }, [isTablet, currentScreen]);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const {height} = e.nativeEvent.layout;
        setLayoutHeight(height);
        if (!isAndroidEdgeToEdge) {
            updatePostInputTop(height + bottom);
        }
    }, [bottom, updatePostInputTop]);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const {persistentNotificationsEnabled, noMentionsError, mentionsList} = usePersistentNotificationProps({
        value,
        channelType,
        postPriority,
    });

    const handleSendMessage = useCallback(async (schedulingInfoParam?: SchedulingInfo) => {
        const schedulingInfo = (schedulingInfoParam && 'scheduled_at' in schedulingInfoParam) ? schedulingInfoParam : undefined;

        if (persistentNotificationsEnabled) {
            const sendMessageWithScheduledPost = () => sendMessage(schedulingInfo);
            await persistentNotificationsConfirmation(serverUrl, value, mentionsList, intl, sendMessageWithScheduledPost, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType);
            return Promise.resolve();
        }
        return sendMessage(schedulingInfo);
    }, [persistentNotificationsEnabled, serverUrl, value, mentionsList, intl, sendMessage, persistentNotificationMaxRecipients, persistentNotificationInterval, currentUserId, channelName, channelType]);

    const handleShowScheduledPostOptions = useCallback(() => {
        if (!scheduledPostsEnabled) {
            return;
        }

        Keyboard.dismiss();
        CallbackStore.setCallback<((schedulingInfo: SchedulingInfo) => Promise<void | {data?: boolean; error?: unknown}>)>(handleSendMessage);
        navigateToScreen(Screens.SCHEDULED_POST_OPTIONS);
    }, [handleSendMessage, scheduledPostsEnabled]);

    const sendActionDisabled = !canSend || noMentionsError;
    useAnimatedReaction(
        () => keyboardHeight.value,
        (kbHeight) => {
            if (isAndroidEdgeToEdge) {
                runOnJS(updatePostInputTop)(layoutHeight + kbHeight + (2 * bottom));
            }
        },
        [layoutHeight, updatePostInputTop, bottom],
    );

    return (
        <>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            <SafeAreaView
                edges={edges}
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
                            showScheduledPostOptions={handleShowScheduledPostOptions}
                            scheduledPostEnabled={scheduledPostsEnabled}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

export default DraftInput;
