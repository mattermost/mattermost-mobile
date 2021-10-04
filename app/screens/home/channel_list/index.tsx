// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React from 'react';
import {Text, View} from 'react-native';
import {TextInput} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import Typography from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import {Device, View as ViewConstants} from '@constants';
import {useTheme} from '@context/theme';
import {useSplitView} from '@hooks/device';
import Channel from '@screens/channel';
import {goToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        fontWeight: '600',
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
    const params = route.params as {direction: string};

    let tabletSidebarStyle;
    if (showTabletLayout) {
        const {TABLET} = ViewConstants;
        tabletSidebarStyle = {maxWidth: TABLET.SIDEBAR_WIDTH};
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
        <SafeAreaView
            style={[styles.flex, {backgroundColor: theme.sidebarBg}]}
        >
            <Animated.View
                style={[styles.content, animated]}
            >
                <View style={{flex: 1, flexDirection: 'row'}}>
                    {/* <Text
                        onPress={() => goToScreen('Channel', '', undefined, {topBar: {visible: false}})}
                        style={[Typography.Heading1000, {color: theme.sidebarText}]}
                    >
                        {'Channel List'}
                    </Text> */}
                    <View style={{flex: 1, flexGrow: 1, alignContent: 'center', alignItems: 'center'}}>

                        <View
                            style={{
                                width: 48,
                                height: 48,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 12,
                                padding: 12,
                            }}
                        >
                            <CompassIcon
                                name='server-outline'
                                style={{fontSize: 24, lineHeight: 28, color: changeOpacity(theme.sidebarText, 0.56)}}
                            />
                        </View>
                        <View
                            style={{
                                backgroundColor: theme.sidebarHeaderBg,
                                flex: 1,
                                borderTopRightRadius: 12,
                                padding: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    backgroundColor: changeOpacity(theme.sidebarText, 0.08),
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 10,
                                }}
                            >
                                <CompassIcon
                                    name='plus'
                                    style={{fontSize: 24, lineHeight: 28, color: changeOpacity(theme.sidebarText, 0.56)}}
                                />
                            </View>
                        </View>
                    </View>
                    <View
                        style={{

                            // display: 'flex',

                            // flexDirection: 'column',
                            // alignContent: 'flex-start',
                            // alignItems: 'flex-start',
                            // justifyContent: 'flex-start',
                            flex: 1,
                            flexGrow: 4,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                        }}
                    >
                        <View style={{flex: 1}}>
                            <Text style={[Typography.Heading700, {color: theme.sidebarText}]}>
                                {'Contributors'}
                            </Text>
                            <Text style={[Typography.Body50Semibold, {color: changeOpacity(theme.sidebarText, 0.64)}]}>
                                {'Community'}
                            </Text>
                        </View>
                        <View
                            style={{
                                display: 'flex',
                                flexDirection: 'row',

                                // alignSelf: 'flex-start',
                                // alignContent: 'flex-start',
                                // alignItems: 'flex-start',
                                // justifyContent: 'flex-start',
                                width: '100%',
                                backgroundColor: changeOpacity(theme.sidebarText, 0.12),
                                borderRadius: 8,
                                padding: 8,
                            }}
                        >
                            <CompassIcon
                                name='magnify'
                                style={{flex: 1, flexGrow: 1, fontSize: 24, lineHeight: 28, color: changeOpacity(theme.sidebarText, 0.72)}}
                            />
                            <TextInput
                                style={[Typography.Body200, {
                                    flex: 1,
                                    flexGrow: 6,
                                }]}
                                placeholder='Find Channels'
                                placeholderTextColor={changeOpacity(theme.sidebarText, 0.72)}
                            />
                        </View>
                        <View style={{display: 'flex', flexDirection: 'row', paddingVertical: 8, marginTop: 12}}>
                            <CompassIcon
                                name='message-check-outline'
                                style={{fontSize: 24, lineHeight: 28, color: theme.sidebarText}}
                            />
                            <Text style={[Typography.Body200Semibold, {color: theme.sidebarText, paddingLeft: 12}]}>{'Threads'}</Text>
                        </View>
                        <View style={{display: 'flex', flexDirection: 'row', paddingVertical: 8, marginTop: 12}}>
                            <Text style={[Typography.Heading75, {color: changeOpacity(theme.sidebarText, 0.64)}]}>{'UNREADS'}</Text>
                        </View>
                        <View style={{display: 'flex', flex: 1, flexDirection: 'row', paddingVertical: 4}}>
                            <CompassIcon
                                name='globe'
                                style={{fontSize: 24, lineHeight: 28, color: theme.sidebarText}}
                            />
                            <Text style={[Typography.Body200Semibold, {color: theme.sidebarText, paddingLeft: 12}]}>{'UX Design'}</Text>
                        </View>
                    </View>
                </View>
                {showTabletLayout &&
                    <Channel {...props}/>
                }
            </Animated.View>
        </SafeAreaView>
    );
};

export default ChannelListScreen;
