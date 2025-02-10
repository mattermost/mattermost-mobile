// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Freeze} from 'react-freeze';
import {ScrollView, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {View as ViewConstants} from '@constants';
import {useTheme} from '@context/theme';
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

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
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
    const isFocused = useIsFocused();

    let tabletSidebarStyle;
    if (isTablet) {
        const {TABLET_SIDEBAR_WIDTH} = ViewConstants;
        tabletSidebarStyle = {maxWidth: TABLET_SIDEBAR_WIDTH};
    }

    const params = route.params! as {direction: string};
    const toLeft = params.direction === 'left';

    const onLayout = useCallback(() => {
        setStart(true);
    }, []);

    const animated = useAnimatedStyle(() => {
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
    }, [start]);

    const styles = getStyleSheet(theme);

    const content = currentUser ? (
        <ScrollView
            alwaysBounceVertical={false}
            style={tabletSidebarStyle}
            contentContainerStyle={styles.totalHeight}
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
        <Freeze freeze={!isFocused}>
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='account.screen'
            >
                <View style={[{height: insets.top, flexDirection: 'row'}]}>
                    <View style={[styles.flex, tabletSidebarStyle]}/>
                    {isTablet && <View style={styles.tabletContainer}/>}
                </View>
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
                </Animated.View>
            </SafeAreaView>
        </Freeze>
    );
};

export default AccountScreen;
