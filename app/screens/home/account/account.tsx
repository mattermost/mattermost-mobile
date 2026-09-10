// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHeaderHeight} from '@react-navigation/elements';
import {useRoute} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import SheetTabBarScrim, {useSheetTabBarScrimPadding} from '@components/chrome/sheet_tab_bar_scrim';
import {View as ViewConstants, Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import useAndroidHomeTabBackHandler from '@hooks/android_home_tab_back_handler';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AccountOptions from './components/options';
import AccountTabletView from './components/tablet_view';
import AccountUserInfo from './components/user_info';

import type UserModel from '@typings/database/models/servers/user';

type AccountScreenProps = {
    currentUser?: UserModel;
    enableCustomUserStatuses: boolean;
    showFullName: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        screen: {
            backgroundColor: isPlatformUiIos() ? theme.centerChannelBg : theme.sidebarBg,
            flex: 1,
        },
        flexRow: {
            flex: 1,
            flexDirection: 'row',
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            marginHorizontal: 15,
        },
        tabletContainer: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        tabletDivider: {
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        totalHeight: {height: '100%'},
    };
});

const AccountScreen = ({currentUser, enableCustomUserStatuses, showFullName}: AccountScreenProps) => {
    const theme = useTheme();
    const [start, setStart] = useState(false);
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const scrimPadding = useSheetTabBarScrimPadding();
    const headerHeight = useHeaderHeight();

    // Pad past the native large title instead of relying on automatic insets: iOS only
    // applies those while the content is scrollable, which a short profile is not.
    const platformContentStyle = useMemo(() => ({
        paddingTop: headerHeight,
        paddingBottom: scrimPadding,
    }), [headerHeight, scrimPadding]);

    useAndroidHomeTabBackHandler(Screens.ACCOUNT);

    let tabletSidebarStyle;
    if (isTablet) {
        const {TABLET_SIDEBAR_WIDTH} = ViewConstants;
        tabletSidebarStyle = {maxWidth: TABLET_SIDEBAR_WIDTH};
    }

    // NativeTabs does not pass direction; JS TabBar still does for slide animation.
    const params = route.params as {direction?: string} | undefined;
    const toLeft = params?.direction === 'left';
    const platformUi = isPlatformUiIos();

    const onLayout = useCallback(() => {
        setStart(true);
    }, []);

    const animated = useAnimatedStyle(() => {
        if (platformUi) {
            return {};
        }

        if (start) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(toLeft ? -25 : 25, {duration: 150})}],
        };
    }, [platformUi, start, toLeft]);

    const styles = getStyleSheet(theme);

    const content = currentUser ? (
        <ScrollView
            alwaysBounceVertical={false}
            style={tabletSidebarStyle}
            contentContainerStyle={platformUi ? platformContentStyle : styles.totalHeight}
            contentInsetAdjustmentBehavior='never'
            testID='account.scroll_view'
        >
            <AccountUserInfo
                user={currentUser}
                showFullName={showFullName}
                theme={theme}
            />
            <AccountOptions
                enableCustomUserStatuses={enableCustomUserStatuses}
                isTablet={isTablet}
                user={currentUser}
                theme={theme}
            />
        </ScrollView>
    ) : null;

    return (
        <View
            style={styles.screen}
            testID='account.screen'
        >
            {!platformUi && (
                <View style={[{height: insets.top, flexDirection: 'row', backgroundColor: theme.sidebarBg}]}>
                    <View style={[styles.flex, tabletSidebarStyle]}/>
                    {isTablet && <View style={styles.tabletContainer}/>}
                </View>
            )}
            <Animated.View
                onLayout={onLayout}
                style={[styles.flexRow, animated]}
            >
                {content}
                {isTablet &&
                    <View style={[styles.tabletContainer, styles.tabletDivider]}>
                        <AccountTabletView/>
                    </View>
                }
                {platformUi && <SheetTabBarScrim/>}
            </Animated.View>
        </View>
    );
};

export default AccountScreen;
