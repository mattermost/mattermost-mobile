// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, FlatList, Keyboard, Platform} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannelStats} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import NavigationHeader from '@components/navigation_header';
import {Navigation} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState, useIsTablet} from '@hooks/device';
import {useCollapsibleHeader} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelPostList from './channel_post_list';
import FailedChannels from './failed_channels';
import FailedTeams from './failed_teams';
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
        fontFamily: 'OpenSans-Semibold',
        color: theme.centerChannelColor,
    },
}));

const Channel = ({channelId, componentId, displayName, isOwnDirectMessage, memberCount, name, teamId}: ChannelProps) => {
    const {formatMessage} = useIntl();
    const appState = useAppState();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const {scrollPaddingTop, scrollValue} = useCollapsibleHeader<FlatList<string>>(false, true, false);
    const padding = useMemo(() => ({paddingBottom: scrollPaddingTop * (isTablet ? 2 : 1)}), [scrollPaddingTop, isTablet]);
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

    useEffect(() => {
        if (channelId) {
            fetchChannelStats(serverUrl, channelId);
        }
    }, [channelId]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, []);

    const onTitlePress = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('Title Press go to Channel Info', displayName);
    }, [channelId]);

    if (!teamId) {
        return <FailedTeams/>;
    }

    if (!channelId) {
        return <FailedChannels teamId={teamId}/>;
    }

    let title = displayName;
    if (isOwnDirectMessage) {
        title = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

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
                    scrollValue={scrollValue}
                    showBackButton={!isTablet}
                    subtitle={formatMessage({id: 'channel', defaultMessage: '{count, plural, one {# member} other {# members}}'}, {count: memberCount})}
                    subtitleCompanion={subtitleCompanion}
                    title={title}
                />
                <ChannelPostList
                    channelId={channelId}
                    contentContainerStyle={padding}
                    forceQueryAfterAppState={appState}
                />
            </SafeAreaView>
        </>
    );
};

export default Channel;
