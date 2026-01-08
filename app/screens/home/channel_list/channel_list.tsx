// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, StyleSheet, ToastAndroid, View} from 'react-native';
import Animated, {FadeIn, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {refetchCurrentUser} from '@actions/remote/user';
import FloatingCallContainer from '@calls/components/floating_call_container';
import AnnouncementBanner from '@components/announcement_banner';
import ConnectionBanner from '@components/connection_banner';
import TeamSidebar from '@components/team_sidebar';
import {Screens} from '@constants';
import {HOME_TAB_SCREENS} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {navigateToScreen} from '@screens/navigation';
import {NavigationStore, useCurrentScreen} from '@store/navigation_store';
import {isMainActivity} from '@utils/helpers';
import {tryRunAppReview} from '@utils/reviews';
import {addSentryContext} from '@utils/sentry';

import AdditionalTabletView from './additional_tablet_view';
import CategoriesList from './categories_list';
import Servers from './servers';

import type {LaunchType} from '@typings/launch';

type ChannelProps = {
    hasChannels: boolean;
    isCRTEnabled: boolean;
    hasTeams: boolean;
    hasMoreThanOneTeam: boolean;
    isLicensed: boolean;
    showToS: boolean;
    launchType: LaunchType;
    coldStart?: boolean;
    currentUserId?: string;
    hasCurrentUser: boolean;
    showIncomingCalls: boolean;
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    flex: {
        flex: 1,
    },
});

let backPressedCount = 0;
let backPressTimeout: NodeJS.Timeout|undefined;

// This is needed since the Database Provider is recreating this component
// when the database is changed (couldn't find exactly why), re-triggering
// the effect. This makes sure the rate logic is only handle on the first
// run. Most of the normal users won't see this issue, but on edge times
// (near the time you will see the rate dialog) will show when switching
// servers.
let hasRendered = false;

const ChannelListScreen = (props: ChannelProps) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const intl = useIntl();

    const isTablet = useIsTablet();
    const route = useRoute();
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const currentScreen = useCurrentScreen();
    const insets = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const params = route.params as {direction: string};
    const canAddOtherServers = managedConfig?.allowOtherServers !== 'false';
    const isTabScreen = currentScreen && HOME_TAB_SCREENS.has(currentScreen);

    const handleBackPress = useCallback(() => {
        const focused = navigation.isFocused();

        if (isMainActivity()) {
            if (!backPressedCount && focused) {
                backPressedCount++;
                ToastAndroid.show(intl.formatMessage({
                    id: 'mobile.android.back_handler_exit',
                    defaultMessage: 'Press back again to exit',
                }), ToastAndroid.SHORT);

                if (backPressTimeout) {
                    clearTimeout(backPressTimeout);
                }
                backPressTimeout = setTimeout(() => {
                    clearTimeout(backPressTimeout!);
                    backPressedCount = 0;
                }, 2000);
                return true;
            }
            BackHandler.exitApp();
            return true;
        }
        return false;
    }, [intl, navigation]);

    const animated = useAnimatedStyle(() => {
        if (!isTabScreen) {
            return {};
        }

        if (!isFocused) {
            let initial = 0;
            if (params?.direction) {
                initial = -25;
            }
            return {
                opacity: withTiming(0, {duration: 150}),
                transform: [{translateX: withTiming(initial, {duration: 150})}],
            };
        }
        return {
            opacity: withTiming(1, {duration: 150}),
            transform: [{translateX: withTiming(0, {duration: 150})}],
        };
    }, [isFocused, isTabScreen, params]);

    const top = useAnimatedStyle(() => {
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    }, [theme, insets.top]);

    useEffect(() => {
        if (!props.hasTeams) {
            navigateToScreen(Screens.SELECT_TEAM, undefined, true);
        }
    }, [props.hasTeams]);

    useEffect(() => {
        const back = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => back.remove();
    }, [handleBackPress]);

    useEffect(() => {
        addSentryContext(serverUrl);
    }, [serverUrl]);

    useEffect(() => {
        if (props.showToS && !NavigationStore.isToSOpen()) {
            navigateToScreen(Screens.TERMS_OF_SERVICE);
        }
    }, [props.showToS]);

    useEffect(() => {
        if (!props.hasCurrentUser || !props.currentUserId) {
            refetchCurrentUser(serverUrl, props.currentUserId);
        }
    }, [props.currentUserId, props.hasCurrentUser, serverUrl]);

    useEffect(() => {
        if (hasRendered) {
            return;
        }
        hasRendered = true;
        if (!NavigationStore.isToSOpen()) {
            tryRunAppReview(props.launchType, props.coldStart);
        }

        // Init the rate app. Only run the effect on the first render if ToS is not open
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        PerformanceMetricsManager.finishLoad('HOME', serverUrl);
        PerformanceMetricsManager.measureTimeToInteraction();

        // Performance metrics for home screen only need to be recorded once on initial load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            entering={FadeIn.duration(350)}
            style={styles.flex}
            testID='channel_list.screen'
        >
            <Animated.View style={top}/>
            <ConnectionBanner/>
            {props.isLicensed &&
            <AnnouncementBanner/>
            }
            <View style={styles.content}>
                {canAddOtherServers && <Servers/>}
                <Animated.View
                    style={[styles.content, animated]}
                >
                    <TeamSidebar
                        iconPad={canAddOtherServers}
                        hasMoreThanOneTeam={props.hasMoreThanOneTeam}
                    />
                    <CategoriesList
                        iconPad={canAddOtherServers && !props.hasMoreThanOneTeam}
                        isCRTEnabled={props.isCRTEnabled}
                        moreThanOneTeam={props.hasMoreThanOneTeam}
                        hasChannels={props.hasChannels}
                    />
                    {isTablet && props.hasChannels &&
                    <AdditionalTabletView/>
                    }
                    {props.showIncomingCalls && !isTablet &&
                    <FloatingCallContainer
                        showIncomingCalls={props.showIncomingCalls}
                        channelsScreen={true}
                    />
                    }
                </Animated.View>
            </View>
        </Animated.View>
    );
};

export default ChannelListScreen;
