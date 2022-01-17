// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {useIsFocused, useRoute} from '@react-navigation/native';
import React from 'react';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import ChannelList from '@components/channel_list';
import TeamSidebar from '@components/team_sidebar';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Channel from '@screens/channel';
import ServerIcon from '@screens/home/channel_list/server_icon/server_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelProps = {
    teamsCount: number;
    time?: number;
};

const edges: Edge[] = ['bottom', 'left', 'right'];
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
    const managedConfig = useManagedConfig();

    const isTablet = useIsTablet();
    const route = useRoute();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const params = route.params as {direction: string};
    const canAddOtherServers = managedConfig?.allowOtherServers !== 'false';

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

    return (
        <>
            {<Animated.View style={top}/>}
            <SafeAreaView
                style={styles.content}
                edges={edges}
            >
                {canAddOtherServers && <ServerIcon/>}
                <Animated.View
                    style={[styles.content, animated]}
                >
                    <TeamSidebar
                        iconPad={canAddOtherServers}
                        teamsCount={props.teamsCount}
                    />
                    <ChannelList
                        iconPad={canAddOtherServers && props.teamsCount <= 1}
                        isTablet={isTablet}
                        teamsCount={props.teamsCount}
                    />
                    {isTablet &&
                        <Channel/>
                    }
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

export default ChannelListScreen;
