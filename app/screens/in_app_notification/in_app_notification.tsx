// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {GestureDetector, Gesture, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {openNotification} from '@actions/remote/notifications';
import DatabaseManager from '@database/manager';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

import Icon from './icon';
import Server from './server';
import Title from './title';

type InAppNotificationProps = {
    notification: NotificationWithData;
    serverName?: string;
    serverUrl: string;
    onDismiss: () => void;
}

const AUTO_DISMISS_TIME_MILLIS = 5000;
const DISMISS_POSITION = -130;

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        backgroundColor: changeOpacity('#000', 0.88),
        borderRadius: 12,
        flexDirection: 'row',
        padding: 10,
        width: '95%',
    },
    tablet: {
        width: 500,
    },
    flex: {
        width: '100%',
    },
    message: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'OpenSans',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'column',
        alignSelf: 'stretch',
        alignItems: 'flex-start',
        marginLeft: 10,
        minHeight: 60,
    },
    touchable: {
        flexDirection: 'row',
    },
    gestureHandler: {
        flex: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});

const InAppNotification = ({serverName, serverUrl, notification, onDismiss}: InAppNotificationProps) => {
    const [animate, setAnimate] = useState(false);
    const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
    const initial = useSharedValue(DISMISS_POSITION);
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();

    const tapped = useRef<boolean>(false);

    const animateDismissOverlay = () => {
        cancelDismissTimer();
        setAnimate(true);
        dismissTimerRef.current = setTimeout(dismiss, 1000);
    };

    const cancelDismissTimer = () => {
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
        }
    };

    const dismiss = useCallback(() => {
        cancelDismissTimer();
        onDismiss();
    }, [onDismiss]);

    const notificationTapped = usePreventDoubleTap(useCallback(() => {
        tapped.current = true;
        dismiss();

        // Open notification after dismissing
        if (serverUrl) {
            const {channel_id} = notification.payload || {};
            if (channel_id) {
                openNotification(serverUrl, notification);
            }
        }
    }, [dismiss, serverUrl, notification]));

    useEffect(() => {
        // On mount, just animate in
        // On notification change, animate out old then in with new
        const isFirstRender = initial.value === DISMISS_POSITION && !animate;

        const startAutoDismissTimer = () => {
            dismissTimerRef.current = setTimeout(() => {
                if (!tapped.current) {
                    animateDismissOverlay();
                }
            }, AUTO_DISMISS_TIME_MILLIS);
        };

        const animateInNewNotification = () => {
            // Animate in the new notification
            initial.value = 0;
            startAutoDismissTimer();
        };

        const resetAndAnimateIn = () => {
            // Reset to dismissed position
            setAnimate(false);
            initial.value = DISMISS_POSITION;

            // Small delay to ensure state is reset before animating in
            requestAnimationFrame(animateInNewNotification);
        };

        if (isFirstRender) {
            // First render: just animate in
            initial.value = 0;
            tapped.current = false;
            startAutoDismissTimer();
        } else {
            // Notification changed: animate out old, then in with new
            setAnimate(true);
            tapped.current = false;

            // Wait for dismiss animation to complete, then reset and animate in new
            const animationTimeout = setTimeout(resetAndAnimateIn, 300); // Match animation duration

            return () => {
                clearTimeout(animationTimeout);
                cancelDismissTimer();
            };
        }

        return cancelDismissTimer;

        // Trigger on notification changes
        // initial and animate are reanimated/state values that we check but don't depend on for re-triggering
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notification]);

    const animatedStyle = useAnimatedStyle(() => {
        const translateY = animate ? withTiming(DISMISS_POSITION, {duration: 300}) : withTiming(initial.value, {duration: 300});

        return {

            marginTop: insets.top,
            transform: [{translateY}],
        };
    }, [animate, insets.top]);

    const message = notification.payload?.body || notification.payload?.message;
    const gesture = Gesture.Pan().activeOffsetY(-20).onStart(() => runOnJS(animateDismissOverlay)());

    const database = secureGetFromRecord(DatabaseManager.serverDatabases, serverUrl)?.database;

    return (
        <GestureHandlerRootView
            style={styles.gestureHandler}
            pointerEvents='box-none'
        >
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={[styles.container, isTablet ? styles.tablet : undefined, animatedStyle]}
                    testID='in_app_notification.screen'
                >
                    <View style={styles.flex}>
                        <TouchableOpacity
                            style={styles.touchable}
                            onPress={notificationTapped}
                            activeOpacity={1}
                        >
                            {Boolean(database) &&
                            <Icon
                                database={database!}
                                fromWebhook={notification.payload?.from_webhook === 'true'}
                                overrideIconUrl={notification.payload?.override_icon_url}
                                senderId={notification.payload?.sender_id || ''}
                                serverUrl={serverUrl}
                                useUserIcon={notification.payload?.use_user_icon === 'true'}
                            />
                            }
                            <View style={styles.titleContainer}>
                                <Title channelName={notification.payload?.channel_name || ''}/>
                                <View style={styles.flex}>
                                    <Text
                                        numberOfLines={2}
                                        ellipsizeMode='tail'
                                        style={styles.message}
                                        testID='in_app_notification.message'
                                    >
                                        {message}
                                    </Text>
                                </View>
                                {Boolean(serverName) && <Server serverName={serverName!}/>}
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

export default InAppNotification;
