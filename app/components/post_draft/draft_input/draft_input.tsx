// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, type LayoutChangeEvent, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {useAnimatedKeyboard} from 'react-native-keyboard-controller';
import Animated, {useAnimatedReaction, useAnimatedStyle} from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {scheduleOnRN} from 'react-native-worklets';

import RewritingIndicator from '@agents/components/rewriting_indicator';
import {Events, Screens} from '@constants';
import {isAndroidEdgeToEdge} from '@constants/device';
import {FLOATING_CHROME_SHADOW, FLOATING_COMPOSE_FOCUSED_HORIZONTAL_INSET, FLOATING_COMPOSE_HORIZONTAL_INSET, FLOATING_COMPOSE_PILL_INSET, FLOATING_COMPOSE_TAB_GAP, getFloatingComposeRestingInset, isPlatformUiIos} from '@constants/platform_ui';
import {useKeyboardState} from '@context/keyboard_state';
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

import type {AvailableScreens} from '@typings/screens/navigation';

export type Props = {
    testID?: string;
    channelId: string;
    channelType?: ChannelType;
    channelName?: string;
    rootId?: string;
    currentUserId: string;
    canShowPostPriority?: boolean;
    location?: AvailableScreens;

    // Post Props
    postPriority: PostPriority;
    postBoRConfig?: PostBoRConfig;
    updatePostPriority: (postPriority: PostPriority) => void;
    updatePostBoRStatus: (config: PostBoRConfig) => void;
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
        floatingActionsContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',

            // Pill already applies FLOATING_COMPOSE_PILL_INSET (8) — keep bottom flush so
            // icon clearance matches the left inset used by the quick-action buttons.
            paddingBottom: 0,
            paddingTop: 8,
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
        floatingInputContentContainer: {
            alignItems: 'stretch',
            paddingTop: 0,
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

        // Outer wrapper carries the soft floating-chrome shadow (overflow:hidden would clip it).
        floatingComposeShadow: {
            ...FLOATING_CHROME_SHADOW,
        },
        floatingComposeResting: {
            marginHorizontal: FLOATING_COMPOSE_HORIZONTAL_INSET,
        },
        floatingComposeFocused: {
            marginHorizontal: FLOATING_COMPOSE_FOCUSED_HORIZONTAL_INSET,
        },

        // Opaque floating pill — GlassView over the post list washes out channel content on iOS 26.
        floatingInput: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderWidth: StyleSheet.hairlineWidth,
            flexDirection: 'row',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: FLOATING_COMPOSE_PILL_INSET,
        },
        floatingInputResting: {
            borderRadius: 40,
        },
        floatingInputFocused: {
            borderRadius: 28,
        },
        restingRow: {
            alignItems: 'center',
            flexDirection: 'row',
            minHeight: 40,
        },
        restingInputWrap: {
            flex: 1,
            justifyContent: 'center',
            minWidth: 0,
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
    updatePostBoRStatus,
    persistentNotificationInterval,
    persistentNotificationMaxRecipients,
    setIsFocused,
    scheduledPostsEnabled,
    postBoRConfig,
    location,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const currentScreen = useCurrentScreen();
    const [layoutHeight, setLayoutHeight] = useState(0);
    const {bottom} = useSafeAreaInsets();
    const {inputRef, stateContext, blurAndDismissKeyboard} = useKeyboardState();
    const [focused, setFocused] = useState(false);
    const platformUi = isPlatformUiIos();
    const animatedKeyboard = useAnimatedKeyboard();
    const restingInset = getFloatingComposeRestingInset(bottom);

    const updateFocused = useCallback((next: boolean) => {
        setFocused(next);
        setIsFocused(next);
    }, [setIsFocused]);

    const setTabBarVisible = useCallback((show: boolean) => {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, show);
    }, []);

    useEffect(() => {
        return () => {
            if (isPlatformUiIos()) {
                DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
            }
        };
    }, []);

    const focus = useCallback(() => {
        inputRef.current?.focus();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const edges = useMemo<Edge[]>(() => {
        if (isTablet && currentScreen === Screens.CHANNEL_LIST) {
            return ['left', 'right'];
        }

        return SAFE_AREA_VIEW_EDGES;
    }, [isTablet, currentScreen]);

    // Resting inset keeps compose above NativeTabs. Software keyboard / emoji picker
    // lift is applied below; hardware-keyboard focus stays at restingInset (height 0).
    const getComposeBottomMargin = useCallback(() => {
        if (!platformUi) {
            return bottom;
        }

        const lift = Math.max(animatedKeyboard.height.value, stateContext.inputAccessoryHeight.value);
        return lift > 0 ? lift + FLOATING_COMPOSE_TAB_GAP : restingInset;
    }, [animatedKeyboard, bottom, platformUi, restingInset, stateContext.inputAccessoryHeight]);

    const floatingPositionStyle = useAnimatedStyle(() => {
        // Full keyboard (incl. predictive bar) or emoji accessory — sit GAP above it.
        // Avoids postInputTranslateY safe-area/tab math that left the pill behind the keyboard.
        // List clearance uses this margin via KeyboardAware onLayout; contentInset stays 0 on platform UI.
        const lift = Math.max(animatedKeyboard.height.value, stateContext.inputAccessoryHeight.value);
        return {
            marginBottom: lift > 0 ? lift + FLOATING_COMPOSE_TAB_GAP : restingInset,
        };
    }, [restingInset, animatedKeyboard, stateContext.inputAccessoryHeight]);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const {height} = e.nativeEvent.layout;
        setLayoutHeight(height);
        if (!isAndroidEdgeToEdge) {
            // Platform UI marginBottom is the full offset from the screen bottom; do not add safe area again.
            updatePostInputTop(height + getComposeBottomMargin());
        }
    }, [getComposeBottomMargin, updatePostInputTop]);

    useEffect(() => {
        if (!isAndroidEdgeToEdge && platformUi && layoutHeight) {
            updatePostInputTop(layoutHeight + getComposeBottomMargin());
        }
    }, [getComposeBottomMargin, layoutHeight, platformUi, updatePostInputTop]);

    useAnimatedReaction(
        () => Math.max(animatedKeyboard.height.value, stateContext.inputAccessoryHeight.value),
        (lift, previousLift) => {
            if (platformUi) {
                const occupied = lift > 0;
                const wasOccupied = (previousLift ?? 0) > 0;
                if (occupied !== wasOccupied) {
                    scheduleOnRN(setTabBarVisible, !occupied);
                }
            }

            if (!platformUi || isAndroidEdgeToEdge || !layoutHeight) {
                return;
            }
            const margin = lift > 0 ? lift + FLOATING_COMPOSE_TAB_GAP : restingInset;
            scheduleOnRN(updatePostInputTop, layoutHeight + margin);
        },
        [layoutHeight, platformUi, restingInset, setTabBarVisible, updatePostInputTop, animatedKeyboard, stateContext.inputAccessoryHeight],
    );

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

    const handleShowScheduledPostOptions = useCallback(async () => {
        if (!scheduledPostsEnabled) {
            return;
        }

        await blurAndDismissKeyboard();
        CallbackStore.setCallback<((schedulingInfo: SchedulingInfo) => Promise<void | {data?: boolean; error?: unknown}>)>(handleSendMessage);
        navigateToScreen(Screens.SCHEDULED_POST_OPTIONS);
    }, [blurAndDismissKeyboard, handleSendMessage, scheduledPostsEnabled]);

    const sendActionDisabled = !canSend || noMentionsError;
    useAnimatedReaction(
        () => stateContext.postInputTranslateY.value,
        (translateY) => {
            if (isAndroidEdgeToEdge) {
                scheduleOnRN(updatePostInputTop, layoutHeight + translateY + (2 * bottom));
            }
        },
        [layoutHeight, updatePostInputTop, bottom, stateContext.postInputTranslateY],
    );

    const resting = platformUi && !focused;
    const showExpandedActions = !platformUi || focused;

    const quickActions = (
        <QuickActions
            testID={quickActionsTestID}
            fileCount={files.length}
            addFiles={addFiles}
            updateValue={updateValue}
            value={value}
            postPriority={postPriority}
            updatePostPriority={updatePostPriority}
            canShowPostPriority={canShowPostPriority}
            postBoRConfig={postBoRConfig}
            updatePostBoRStatus={updatePostBoRStatus}
            focus={focus}
            location={location}
            compact={resting}
            floating={platformUi}
        />
    );

    const sendAction = (
        <SendAction
            testID={sendActionTestID}
            disabled={sendActionDisabled}
            sendMessage={handleSendMessage}
            showScheduledPostOptions={handleShowScheduledPostOptions}
            scheduledPostEnabled={scheduledPostsEnabled}
            circular={platformUi}
        />
    );

    const inputBody = (
        <ScrollView
            style={style.inputContainer}
            contentContainerStyle={platformUi ? style.floatingInputContentContainer : style.inputContentContainer}
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
                postBoRConfig={postBoRConfig}
            />
            <View style={resting ? style.restingRow : undefined}>
                {resting && quickActions}
                <View style={resting ? style.restingInputWrap : undefined}>
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
                        setIsFocused={updateFocused}
                    />
                </View>
                {resting && sendAction}
            </View>
            <Uploads
                currentUserId={currentUserId}
                files={files}
                uploadFileError={uploadFileError}
                channelId={channelId}
                rootId={rootId}
            />
            {showExpandedActions && (
                <View style={platformUi ? style.floatingActionsContainer : style.actionsContainer}>
                    {quickActions}
                    {sendAction}
                </View>
            )}
        </ScrollView>
    );

    return (
        <>
            <RewritingIndicator/>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            {platformUi ? (
                <Animated.View
                    style={[
                        style.floatingComposeShadow,
                        focused ? style.floatingComposeFocused : style.floatingComposeResting,
                        floatingPositionStyle,
                    ]}
                >
                    <SafeAreaView
                        edges={edges}
                        onLayout={handleLayout}
                        style={[
                            style.floatingInput,
                            focused ? style.floatingInputFocused : style.floatingInputResting,
                        ]}
                        testID={testID}
                    >
                        {inputBody}
                    </SafeAreaView>
                </Animated.View>
            ) : (
                <SafeAreaView
                    edges={edges}
                    onLayout={handleLayout}
                    style={style.inputWrapper}
                    testID={testID}
                >
                    {inputBody}
                </SafeAreaView>
            )}
        </>
    );
}

export default DraftInput;
