// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React from 'react';
import {Text, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import TeamSidebar from '@components/team_sidebar';
import {Device, View as ViewConstants} from '@constants';
import {useTheme} from '@context/theme';
import {useSplitView} from '@hooks/device';
import Channel from '@screens/channel';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {LaunchProps} from '@typings/launch';

type ChannelProps = LaunchProps & {
    time?: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'OpenSans-Semibold',
        color: theme.centerChannelColor,
    },
}));

const ChannelListScreen = (props: ChannelProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isSplitView = useSplitView();
    const showTabletLayout = Device.IS_TABLET && !isSplitView;
    const route = useRoute();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const params = route.params as {direction: string};

    let tabletSidebarStyle;
    if (showTabletLayout) {
        const {TABLET, TEAM_SIDEBAR_WIDTH} = ViewConstants;
        tabletSidebarStyle = {maxWidth: (TABLET.SIDEBAR_WIDTH - TEAM_SIDEBAR_WIDTH)};
    }

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

    return (
        <>
            {Boolean(insets.top) && <View style={{height: insets.top, backgroundColor: theme.sidebarBg}}/>}
            <SafeAreaView
                style={styles.content}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View
                    style={[styles.content, animated]}
                >
                    <TeamSidebar/>
                    <View style={[styles.flex, {alignItems: 'center', justifyContent: 'center'}, tabletSidebarStyle]}>
                        <Text
                            onPress={() => goToScreen('Channel', '', undefined, {topBar: {visible: false}})}
                            style={{fontSize: 20, color: theme.centerChannelColor}}
                        >
                            {'Channel List'}
                        </Text>
                    </View>
                    {showTabletLayout &&
                        <Channel {...props}/>
                    }
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

export default ChannelListScreen;
