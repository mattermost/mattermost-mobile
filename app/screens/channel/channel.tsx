// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import NavigationHeader from '@components/navigation_header';
import {Navigation} from '@constants';
import {useTheme} from '@context/theme';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelPostList from './channel_post_list';
import OtherMentionsBadge from './other_mentions_badge';

import type {HeaderRightButton} from '@components/navigation_header/header';

type ChannelProps = {
    channelId: string;
    componentId?: string;
    displayName: string;
    isOwnDirectMessage: boolean;
    memberCount: number;
    name: string;
    teamId: string;
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    sectionContainer: {
        marginTop: 10,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'OpenSans-SemiBold',
        color: theme.centerChannelColor,
    },
}));

const Channel = ({channelId, componentId, displayName, isOwnDirectMessage, memberCount, name, teamId}: ChannelProps) => {
    const {formatMessage} = useIntl();
    const appState = useAppState();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const defaultHeight = useDefaultHeaderHeight();
    const rightButtons: HeaderRightButton[] = useMemo(() => ([{
        iconName: 'magnify',
        onPress: () => {
            DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {screen: 'Search', params: {searchTerm: `in: ${name}`}});
            if (!isTablet) {
                popTopScreen(componentId);
            }
        },
    }, {
        iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
        onPress: () => true,
        buttonType: 'opacity',
    }]), [channelId, isTablet, name]);

    const leftComponent = useMemo(() => {
        if (isTablet || !channelId || !teamId) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={channelId}/>);
    }, [isTablet, channelId, teamId]);

    const subtitleCompanion = useMemo(() => (
        <CompassIcon
            color={changeOpacity(theme.sidebarHeaderTextColor, 0.72)}
            name='chevron-right'
            size={14}
        />
    ), []);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, []);

    const onTitlePress = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('Title Press go to Channel Info', displayName);
    }, [channelId]);

    let title = displayName;
    if (isOwnDirectMessage) {
        title = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const marginTop = defaultHeight + (isTablet ? insets.top : 0);

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
            >
                <NavigationHeader
                    isLargeTitle={false}
                    leftComponent={leftComponent}
                    onBackPress={onBackPress}
                    onTitlePress={onTitlePress}
                    rightButtons={rightButtons}
                    showBackButton={!isTablet}
                    subtitle={formatMessage({id: 'channel', defaultMessage: '{count, plural, one {# member} other {# members}}'}, {count: memberCount})}
                    subtitleCompanion={subtitleCompanion}
                    title={title}
                />
                <View style={[styles.flex, {marginTop}]}>
                    <ChannelPostList
                        channelId={channelId}
                        forceQueryAfterAppState={appState}
                    />
                </View>
            </SafeAreaView>
        </>
    );
};

export default Channel;
