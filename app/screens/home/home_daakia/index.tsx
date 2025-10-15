// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {switchToGlobalThreads} from '@actions/local/thread';
import DaakiaChannelListEnhanced from '@components/daakia_components/daakia_channel_list_enhanced';
import DaakiaHeader from '@components/daakia_components/daakia_header';
import DaakiaTabs from '@components/daakia_components/daakia_tabs';
import {Permissions} from '@constants';
import {HOME_PADDING} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeUnreadsAndMentions} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import SearchField from '@screens/home/channel_list/categories_list/subheader/search_field';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
    body: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        ...HOME_PADDING,
    },
}));

type ThreadsUnread = {unreads: boolean; mentions: number};

const HomeDaakia = ({currentTeamId, threadsUnread, teamDisplayName, canCreateChannels, canJoinChannels, canInvitePeople}: {currentTeamId?: string; threadsUnread?: ThreadsUnread; teamDisplayName?: string; canCreateChannels?: boolean; canJoinChannels?: boolean; canInvitePeople?: boolean}) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const nav = useNavigation();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const [activeFilter, setActiveFilter] = useState('all');

    const stateIndex = nav.getState()?.index;
    const homeDaakiaScreenIndex = 0;

    const handleMenuPress = () => {
        (nav as any).navigate('Home');
    };

    const handleTabPress = (tabId: string) => {
        if (tabId === 'threads') {
            switchToGlobalThreads(serverUrl);
            return;
        }
        setActiveFilter(tabId);
    };
    const tabs = [
        {id: 'all', title: 'All', icon: 'home-variant-outline'},
        {id: 'dms', title: 'DMs', icon: 'account-outline'},
        {id: 'threads', title: 'Threads', icon: 'message-text-outline', hasUnread: Boolean(threadsUnread?.unreads || (threadsUnread?.mentions || 0) > 0)},
        {id: 'channels', title: 'Channels', icon: 'pound'},
        {id: 'favorites', title: 'Favorites', icon: 'star'},
        {id: 'unread', title: 'Unread', icon: 'mark-as-unread'},
    ];

    const top = useAnimatedStyle(() => {
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    }, [theme, insets.top]);

    const bodyAnimated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming((stateIndex || 0) > homeDaakiaScreenIndex ? -25 : 25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    return (
        <>
            <Animated.View style={top}/>
            <SafeAreaView
                style={styles.container}
                edges={['bottom', 'left', 'right']}
            >
                {isFocused && (
                    <>
                        <DaakiaHeader
                            label='Team'
                            title={teamDisplayName || 'Daakia Home'}
                            canCreateChannels={canCreateChannels}
                            canJoinChannels={canJoinChannels}
                            canInvitePeople={canInvitePeople}
                            onMenuPress={handleMenuPress}
                            showMenu={false}
                        />
                        <Animated.View style={styles.searchContainer}>
                            <SearchField compact={true}/>
                        </Animated.View>
                        <DaakiaTabs
                            tabs={tabs}
                            activeTab={activeFilter}
                            onTabPress={handleTabPress}
                        />
                        <Animated.View style={[styles.body, bodyAnimated]}>
                            <DaakiaChannelListEnhanced
                                currentTeamId={currentTeamId}
                                locale='en'
                                isTablet={isTablet}
                                filterType={activeFilter}
                            />
                        </Animated.View>
                    </>
                )}
            </SafeAreaView>
        </>
    );
};

const enhanced = withObservables([], ({database}: any) => {
    const team = observeCurrentTeam(database);
    const currentTeamId = observeCurrentTeamId(database);
    const currentUser = observeCurrentUser(database);

    const userAndTeam = combineLatest([currentUser, team]);

    const canJoinChannels = userAndTeam.pipe(
        switchMap(([u, t]: any[]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
    );
    const canCreatePublicChannels = userAndTeam.pipe(
        switchMap(([u, t]: any[]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );
    const canCreatePrivateChannels = userAndTeam.pipe(
        switchMap(([u, t]: any[]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    return {
        currentTeamId,
        threadsUnread: observeUnreadsAndMentions(database, {teamId: undefined as unknown as string, includeDmGm: true}),
        teamDisplayName: team.pipe(
            switchMap((t: any) => of$(t?.displayName)),
        ),
        canJoinChannels,
        canCreateChannels: combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
            switchMap(([open, priv]: boolean[]) => of$(open || priv)),
        ),
        canInvitePeople: of$(true),
    };
});

export default withDatabase(enhanced(HomeDaakia));
