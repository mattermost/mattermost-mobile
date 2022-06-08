// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, StyleSheet, ToastAndroid} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import FreezeScreen from '@components/freeze_screen';
import TeamSidebar from '@components/team_sidebar';
import {Navigation as NavigationConstants, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {resetToTeams} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import AdditionalTabletView from './additional_tablet_view';
import CategoriesList from './categories_list';
import Servers from './servers';

type ChannelProps = {
    channelsCount: number;
    isCRTEnabled: boolean;
    teamsCount: number;
    time?: number;
};

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    content: {
        flex: 1,
        flexDirection: 'row',
    },
});

let backPressedCount = 0;
let backPressTimeout: NodeJS.Timeout|undefined;

const ChannelListScreen = (props: ChannelProps) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const intl = useIntl();

    const isTablet = useIsTablet();
    const route = useRoute();
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const params = route.params as {direction: string};
    const canAddOtherServers = managedConfig?.allowOtherServers !== 'false';

    const handleBackPress = useCallback(() => {
        const isHomeScreen = EphemeralStore.getNavigationTopComponentId() === Screens.HOME;
        const homeTab = EphemeralStore.getVisibleTab() === Screens.HOME;
        const focused = navigation.isFocused() && isHomeScreen && homeTab;
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
        } else if (isHomeScreen && !homeTab) {
            DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_HOME);
            return true;
        }
        return false;
    }, [intl]);

    const animated = useAnimatedStyle(() => {
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
    }, [isFocused, params]);

    const top = useAnimatedStyle(() => {
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    }, [theme]);

    useEffect(() => {
        if (!props.teamsCount) {
            resetToTeams();
        }
    }, [Boolean(props.teamsCount)]);

    useEffect(() => {
        const back = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => back.remove();
    }, [handleBackPress]);

    return (
        <FreezeScreen freeze={!isFocused}>
            {<Animated.View style={top}/>}
            <SafeAreaView
                style={styles.content}
                edges={edges}
                testID='channel_list.screen'
            >
                {canAddOtherServers && <Servers/>}
                <Animated.View
                    style={[styles.content, animated]}
                >
                    <TeamSidebar
                        iconPad={canAddOtherServers}
                        teamsCount={props.teamsCount}
                    />
                    <CategoriesList
                        iconPad={canAddOtherServers && props.teamsCount <= 1}
                        isCRTEnabled={props.isCRTEnabled}
                        isTablet={isTablet}
                        teamsCount={props.teamsCount}
                        channelsCount={props.channelsCount}
                    />
                    {isTablet &&
                        <AdditionalTabletView/>
                    }
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default ChannelListScreen;
