// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {GestureDetector, Gesture, GestureHandlerRootView} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {openNotification} from '@actions/remote/notifications';
import {Navigation as NavigationTypes} from '@constants';
import DatabaseManager from '@database/manager';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';

import Icon from './icon';
import Server from './server';
import Title from './title';

import type {AvailableScreens} from '@typings/screens/navigation';

type InAppNotificationProps = {
    componentId: AvailableScreens;
    notification: NotificationWithData;
    serverName?: string;
    serverUrl: string;
}

const AUTO_DISMISS_TIME_MILLIS = 5000;

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
    },
});

const InAppNotification = ({componentId, serverName, serverUrl, notification}: InAppNotificationProps) => {
    const [animate, setAnimate] = useState(false);
    const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
    const initial = useSharedValue(-130);
    const isTablet = useIsTablet();
    let insets = {top: 0};
    if (Platform.OS === 'ios') {
        // on Android we disable the safe area provider as it conflicts with the gesture system
        // eslint-disable-next-line react-hooks/rules-of-hooks
        insets = useSafeAreaInsets();
    }

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

    const dismiss = () => {
        cancelDismissTimer();
        dismissOverlay(componentId);
    };

    const notificationTapped = preventDoubleTap(() => {
        tapped.current = true;
        dismiss();
    });

    useEffect(() => {
        initial.value = 0;

        dismissTimerRef.current = setTimeout(() => {
            if (!tapped.current) {
                animateDismissOverlay();
            }
        }, AUTO_DISMISS_TIME_MILLIS);

        return cancelDismissTimer;
    }, []);

    useEffect(() => {
        const didDismissListener = Navigation.events().registerComponentDidDisappearListener(async ({componentId: screen}) => {
            if (componentId === screen && tapped.current && serverUrl) {
                const {channel_id} = notification.payload || {};
                if (channel_id) {
                    openNotification(serverUrl, notification);
                }
            }
        });

        return () => didDismissListener.remove();
    }, []);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(NavigationTypes.NAVIGATION_SHOW_OVERLAY, dismiss);

        return () => listener.remove();
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const translateY = animate ? withTiming(-130, {duration: 300}) : withTiming(initial.value, {duration: 300});

        return {

            marginTop: insets.top,
            transform: [{translateY}],
        };
    }, [animate, insets.top]);

    const message = notification.payload?.body || notification.payload?.message;
    // eslint-disable-next-line new-cap
    const gesture = Gesture.Pan().activeOffsetY(-20).onStart(() => runOnJS(animateDismissOverlay)());

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;

    return (
        <GestureHandlerRootView style={styles.gestureHandler}>
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
