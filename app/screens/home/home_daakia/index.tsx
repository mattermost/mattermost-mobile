// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, TouchableOpacity, Text, DeviceEventEmitter} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {combineLatest, of as of$, Observable} from 'rxjs';
import {switchMap, combineLatestWith, map, distinctUntilChanged} from 'rxjs/operators';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {switchToGlobalThreads} from '@actions/local/thread';
import {fetchPostsForChannel} from '@actions/remote/post';
import FloatingCallContainer from '@calls/components/floating_call_container';
import {observeIncomingCalls} from '@calls/state';
import CompassIcon from '@components/compass_icon';
import DaakiaChannelList from '@components/daakia_components/daakia_channel_list';
import DaakiaHeader from '@components/daakia_components/daakia_header';
import DaakiaTabs from '@components/daakia_components/daakia_tabs';
import Loading from '@components/loading';
import {Events, General, Permissions, Preferences} from '@constants';
import {DMS_CATEGORY, FAVORITES_CATEGORY} from '@constants/categories';
import {DRAFT} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {observeNotifyPropsByChannels} from '@queries/servers/channel';
import {observeDraftCount} from '@queries/servers/drafts';
import {queryPreferencesByCategoryAndName, querySidebarPreferences} from '@queries/servers/preference';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentTeam, queryMyTeams} from '@queries/servers/team';
import {observeUnreadsAndMentions} from '@queries/servers/thread';
import {observeCurrentUser, observeDeactivatedUsers} from '@queries/servers/user';
import {resetToTeams} from '@screens/navigation';
import {type ChannelWithMyChannel, filterArchivedChannels, filterAutoclosedDMs, filterManuallyClosedDms, getUnreadIds, sortChannels} from '@utils/categories';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';

// Helper functions for channel list logic
const observeCategoryChannels = (category: CategoryModel, myChannels: Observable<MyChannelModel[]>) => {
    const channels = category.channels.observeWithColumns(['create_at', 'display_name', 'last_post_at', 'delete_at']);
    const manualSort = category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']);
    return myChannels.pipe(
        combineLatestWith(channels, manualSort),
        switchMap(([my, cs, sorted]) => {
            const channelMap = new Map<string, ChannelModel>(cs.map((c) => [c.id, c]));
            const categoryChannelMap = new Map<string, number>(sorted.map((s) => [s.channelId, s.sortOrder]));
            return of$(my.reduce<ChannelWithMyChannel[]>((result, myChannel) => {
                const channel = channelMap.get(myChannel.id);
                if (channel) {
                    const channelWithMyChannel: ChannelWithMyChannel = {
                        channel,
                        myChannel,
                        sortOrder: categoryChannelMap.get(myChannel.id) || 0,
                    };
                    result.push(channelWithMyChannel);
                }
                return result;
            }, []));
        }),
    );
};

const deduplicateChannels = (channels: ChannelWithMyChannel[]) => {
    const uniqueChannelsMap = new Map<string, ChannelWithMyChannel>();
    channels.forEach((cwm) => {
        if (!uniqueChannelsMap.has(cwm.channel.id)) {
            uniqueChannelsMap.set(cwm.channel.id, cwm);
        }
    });
    return Array.from(uniqueChannelsMap.values());
};

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
    loadingView: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.centerChannelColor + '10',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderRadius: 16,
        backgroundColor: theme.centerChannelColor + '10',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterButtonActive: {
        backgroundColor: theme.buttonBg,
        borderColor: theme.buttonBg,
    },
    filterButtonText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '500',
        color: theme.centerChannelColor,
    },
    filterButtonTextActive: {
        color: theme.buttonColor,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.buttonBg,
        marginLeft: 6,
    },
    floatingCallWrapper: {
        zIndex: 1000,
        elevation: 1000, // For Android
    },
}));

type ThreadsUnread = {unreads: boolean; mentions: number};

type HomeDaakiaProps = {
    threadsUnread?: ThreadsUnread;
    teamDisplayName?: string;
    canCreateChannels?: boolean;
    canJoinChannels?: boolean;
    canInvitePeople?: boolean;
    allChannels: ChannelModel[];
    unreadIds: Set<string>;
    lastPosts?: Map<string, PostModel>;
    currentUserId: string;
    favoriteChannelIds: Set<string>;
    draftsCount?: number;
    showIncomingCalls: boolean;
    nTeams: number;
};

const HomeDaakia = ({
    threadsUnread,
    teamDisplayName,
    canCreateChannels,
    canJoinChannels,
    canInvitePeople,
    allChannels,
    unreadIds,
    lastPosts,
    currentUserId,
    favoriteChannelIds,
    draftsCount,
    showIncomingCalls,
    nTeams,
}: HomeDaakiaProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const nav = useNavigation();
    const serverUrl = useServerUrl();
    const [activeTab, setActiveTab] = useState<'all' | 'dms' | 'channels' | 'favorites'>('all');
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Redirect if user has no teams
    useEffect(() => {
        if (isFocused && nTeams === 0) {
            resetToTeams();
        }
    }, [isFocused, nTeams]);

    // Check if database is empty and fetch all posts if needed
    useEffect(() => {
        if (!isFocused || !allChannels.length) {
            return;
        }

        // Count how many channels have posts in database
        const channelsWithPosts = lastPosts?.size || 0;

        // If database is empty (no posts at all), show loading and fetch everything
        if (channelsWithPosts === 0) {
            setIsLoadingData(true);

            // Helper function to fetch a single channel
            const fetchSingleChannel = (channelId: string) => {
                return fetchPostsForChannel(serverUrl, channelId, false, false).catch(() => {
                    // Ignore errors, continue with others
                });
            };

            // Fetch posts for ALL channels
            const fetchAllPosts = async () => {
                const promises = allChannels.map((channel) => fetchSingleChannel(channel.id));

                // Wait for all to complete
                await Promise.all(promises);

                // Hide loading
                setIsLoadingData(false);
            };

            fetchAllPosts();
        }
    }, [isFocused, allChannels, lastPosts, serverUrl]);

    const stateIndex = nav.getState()?.index;
    const homeDaakiaScreenIndex = 0;

    const handleMenuPress = () => {
        nav.navigate('Home' as never);
    };

    const handleTabPress = (tabId: string) => {
        setActiveTab(tabId as 'all' | 'dms' | 'channels' | 'favorites');
        setActiveFilters((prev) => {
            const newFilters = new Set(prev);
            newFilters.delete('unread');
            return newFilters;
        });
    };

    const handleFilterPress = async (filterId: string) => {
        if (filterId === 'threads') {
            switchToGlobalThreads(serverUrl);
            return;
        }

        if (filterId === 'drafts') {
            const {error} = await switchToGlobalDrafts(serverUrl);
            if (!error) {
                DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, DRAFT);
            }
            return;
        }

        // For unread filter, toggle it
        setActiveFilters((prev) => {
            const newFilters = new Set(prev);
            if (newFilters.has(filterId)) {
                newFilters.delete(filterId);
            } else {
                newFilters.add(filterId);
            }
            return newFilters;
        });
    };

    // (pull-to-refresh removed)

    // Show loading while redirecting if no teams
    if (nTeams === 0) {
        return (
            <SafeAreaView
                style={styles.container}
                edges={['bottom', 'left', 'right']}
            >
                <Loading
                    size='large'
                    themeColor='centerChannelColor'
                    testID='home_daakia.checking_teams'
                />
            </SafeAreaView>
        );
    }

    // Filter channels based on active tab (done in component, not observable)
    const filteredChannels = React.useMemo(() => {
        const isDM = (type: string) => type === General.DM_CHANNEL || type === General.GM_CHANNEL;
        const isChannel = (type: string) => type === General.OPEN_CHANNEL || type === General.PRIVATE_CHANNEL;
        const isUnread = (id: string) => unreadIds.has(id);
        const isFavorite = (id: string) => favoriteChannelIds.has(id);

        let filtered = allChannels;

        // Apply additional filters first (they override main tabs)
        if (activeFilters.has('unread')) {
            filtered = filtered.filter((c) => isUnread(c.id));
            return filtered; // Return early, ignore main tab when unread filter is active
        }

        // Apply tab filter only if no overriding filters are active
        switch (activeTab) {
            case 'dms':
                filtered = filtered.filter((c) => isDM(c.type));
                break;
            case 'channels':
                filtered = filtered.filter((c) => isChannel(c.type));
                break;
            case 'favorites':
                filtered = filtered.filter((c) => isFavorite(c.id));
                break;

            // 'all' shows everything
        }
        if (activeFilters.has('threads')) {
            // For now, show all channels (threads logic can be added later)
            // This would need to check if channel has thread posts
        }
        if (activeFilters.has('drafts')) {
            // For now, show all channels (drafts logic can be added later)
            // This would need to check if user has draft posts in channel
        }

        return filtered;
    }, [allChannels, activeTab, activeFilters, unreadIds, favoriteChannelIds]);
    const tabs = [
        {id: 'all', title: 'All', icon: 'home-variant-outline'},
        {id: 'dms', title: 'DMs', icon: 'account-outline'},
        {id: 'channels', title: 'Channels', icon: 'pound'},
        {id: 'favorites', title: 'Fav', icon: 'star'},
    ];

    const filterButtons = [
        {id: 'threads', title: 'Threads', icon: 'message-text-outline', hasUnread: Boolean(threadsUnread?.unreads || (threadsUnread?.mentions || 0) > 0)},
        {id: 'unread', title: 'Unread', icon: 'mark-as-unread', hasUnread: unreadIds.size > 0},
        {id: 'drafts', title: 'Drafts', icon: 'send-outline', hasUnread: (typeof draftsCount === 'number' ? draftsCount > 0 : false)},
    ];

    const isFocusedValue = useSharedValue(isFocused);
    const stateIndexValue = useSharedValue(stateIndex || 0);

    React.useEffect(() => {
        isFocusedValue.value = isFocused;
    }, [isFocused, isFocusedValue]);

    React.useEffect(() => {
        stateIndexValue.value = stateIndex || 0;
    }, [stateIndex, stateIndexValue]);

    const top = useAnimatedStyle(() => {
        'worklet';
        return {height: insets.top, backgroundColor: theme.sidebarBg};
    }, [theme, insets.top]);

    const bodyAnimated = useAnimatedStyle(() => {
        'worklet';
        if (isFocusedValue.value) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndexValue.value > homeDaakiaScreenIndex ? -25 : 25, {duration: 150})}],
        };
    });

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
                        <DaakiaTabs
                            tabs={tabs}
                            activeTab={activeFilters.has('unread') ? '' : activeTab}
                            onTabPress={handleTabPress}
                        />
                        <Animated.View style={[styles.body, bodyAnimated]}>
                            {/* Filter Buttons - moved to body */}
                            <View style={styles.filterContainer}>
                                {filterButtons.map((filter) => (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={[
                                            styles.filterButton,
                                            activeFilters.has(filter.id) && styles.filterButtonActive,
                                        ]}
                                        onPress={() => handleFilterPress(filter.id)}
                                    >
                                        <CompassIcon
                                            name={filter.icon}
                                            size={16}
                                            color={activeFilters.has(filter.id) ? theme.buttonColor : theme.centerChannelColor}
                                        />
                                        <Text
                                            style={[
                                                styles.filterButtonText,
                                                activeFilters.has(filter.id) && styles.filterButtonTextActive,
                                            ]}
                                        >
                                            {filter.title}
                                        </Text>
                                        {filter.hasUnread && (
                                            <View style={styles.unreadDot}/>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {isLoadingData ? (
                                <View style={styles.loadingView}>
                                    <Loading
                                        size='large'
                                        themeColor='centerChannelColor'
                                        testID='home_daakia.loading'
                                    />
                                </View>
                            ) : (
                                <DaakiaChannelList
                                    allChannels={filteredChannels}
                                    unreadIds={unreadIds}
                                    currentUserId={currentUserId}
                                    lastPosts={lastPosts}
                                    locale={intl.locale}
                                />
                            )}
                        </Animated.View>
                        {/* Floating Call Container for incoming calls */}
                        {showIncomingCalls &&
                            <View style={styles.floatingCallWrapper}>
                                <FloatingCallContainer
                                    showIncomingCalls={showIncomingCalls}
                                    channelsScreen={true}
                                />
                            </View>
                        }
                    </>
                )}
            </SafeAreaView>
        </>
    );
};

// Single merged enhancement layer combining permissions and channel list logic
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const team = observeCurrentTeam(database);
    const currentUser = observeCurrentUser(database);
    const currentUserId = observeCurrentUserId(database);

    // Permission observables
    const userAndTeam = combineLatest([currentUser, team]);
    const canJoinChannels = userAndTeam.pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
    );
    const canCreatePublicChannels = userAndTeam.pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );
    const canCreatePrivateChannels = userAndTeam.pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    // Channel list logic - merged from daakia_channel_list_enhanced
    /* eslint-disable max-nested-callbacks */
    const channelListData = currentTeamId.pipe(
        switchMap((teamId) => {
            if (!teamId) {
                return of$({
                    allChannels: [],
                    unreadIds: new Set(),
                    lastPosts: new Map(),
                    favoriteChannelIds: new Set(),
                });
            }

            const categories = queryCategoriesByTeamIds(database, [teamId]).observeWithColumns(['sort_order', 'type']);

            const mapCategoryToObservable = (category: CategoryModel) => {
                const categoryMyChannels = category.myChannels.observeWithColumns(['last_post_at', 'is_unread', 'mentions_count', 'message_count']);
                return observeCategoryChannels(category, categoryMyChannels);
            };

            const allChannelsWithMyChannel = categories.pipe(
                switchMap((cats) => {
                    if (!cats.length) {
                        return of$([]);
                    }

                    const categoryObservables = cats.map(mapCategoryToObservable);

                    return combineLatest(categoryObservables).pipe(
                        switchMap((results) => {
                            const channels = deduplicateChannels(results.flat() as ChannelWithMyChannel[]);
                            return of$(channels);
                        }),
                    );
                }),
            );

            // Track favorite channel IDs
            const favoriteChannelIds = categories.pipe(
                switchMap((cats) => {
                    const favCategory = cats.find((c) => c.type === FAVORITES_CATEGORY);
                    if (!favCategory) {
                        return of$(new Set<string>());
                    }

                    return favCategory.myChannels.observe().pipe(
                        map((myChannels) => new Set(myChannels.map((mc) => mc.id))),
                    );
                }),
            );

            const currentChannelId = of$('');
            const lastUnreadId = of$(undefined);

            const allChannels = combineLatest([
                allChannelsWithMyChannel,
                currentChannelId,
                lastUnreadId,
                currentUserId,
            ]).pipe(
                switchMap(([channelsWithMyChannel, channelId, unreadId, userId]) => {
                    let filtered = channelsWithMyChannel as ChannelWithMyChannel[];

                    filtered = filterArchivedChannels(filtered, channelId);

                    const myChannels = filtered.map((c) => c.myChannel);
                    const notifyPropsPerChannel = observeNotifyPropsByChannels(database, myChannels);

                    const hiddenDmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, undefined, 'false').
                        observeWithColumns(['value']);
                    const hiddenGmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, undefined, 'false').
                        observeWithColumns(['value']);
                    const manuallyClosedPrefs = hiddenDmPrefs.pipe(
                        combineLatestWith(hiddenGmPrefs),
                        switchMap(([dms, gms]) => of$(dms.concat(gms))),
                    );

                    const approxViewTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME, undefined).
                        observeWithColumns(['value']);
                    const openTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_OPEN_TIME, undefined).
                        observeWithColumns(['value']);
                    const autoclosePrefs = approxViewTimePrefs.pipe(
                        combineLatestWith(openTimePrefs),
                        switchMap(([viewTimes, openTimes]) => of$(viewTimes.concat(openTimes))),
                    );

                    const deactivatedUsers = observeDeactivatedUsers(database);

                    const limit = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
                        observeWithColumns(['value']).pipe(
                            switchMap((val) => {
                                return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                            }),
                        );

                    return combineLatestWith(notifyPropsPerChannel, manuallyClosedPrefs, autoclosePrefs, deactivatedUsers, limit)(of$(filtered)).pipe(
                        switchMap(([cwms, notifyProps, manuallyClosedDms, autoclose, deactivated, maxDms]) => {
                            let channelsW = cwms as ChannelWithMyChannel[];

                            channelsW = filterManuallyClosedDms(channelsW, notifyProps, manuallyClosedDms, userId, unreadId);
                            channelsW = filterAutoclosedDMs(DMS_CATEGORY, maxDms, userId, channelId, channelsW, autoclose, notifyProps, deactivated, unreadId);

                            // Sort by most recent message (last_post_at)
                            // Unread status shown by visual indicators (dots/badges)
                            // Users can use "Unread" tab to see only unread channels
                            return of$(sortChannels('recent', channelsW, notifyProps, 'en'));
                        }),
                    );
                }),
                distinctUntilChanged((prev, curr) => {
                    if (prev.length !== curr.length) {
                        return false;
                    }
                    for (let i = 0; i < Math.min(10, prev.length); i++) {
                        if (prev[i]?.id !== curr[i]?.id) {
                            return false;
                        }
                    }
                    return true;
                }),
            );

            const unreadIds = allChannelsWithMyChannel.pipe(
                combineLatestWith(lastUnreadId),
                switchMap(([cwms, unreadId]) => {
                    const myChannels = (cwms as ChannelWithMyChannel[]).map((c) => c.myChannel);
                    return observeNotifyPropsByChannels(database, myChannels).pipe(
                        switchMap((notifyProps) => {
                            return of$(getUnreadIds(cwms as ChannelWithMyChannel[], notifyProps, unreadId));
                        }),
                    );
                }),
            );

            const lastPosts = allChannelsWithMyChannel.pipe(
                switchMap((channelsWithMyChannel) => {
                    const channels = channelsWithMyChannel as ChannelWithMyChannel[];
                    if (!channels.length) {
                        return of$(new Map<string, PostModel>());
                    }

                    const ids = channels.map((c) => c.channel.id);
                    const perChannelLatestPost$ = ids.map((id) =>
                        database.get<PostModel>('Post').query(
                            Q.where('channel_id', id),
                            Q.sortBy('create_at', Q.desc),
                            Q.take(1),
                        ).observeWithColumns(['create_at', 'message', 'user_id', 'type']),
                    );

                    return combineLatest(perChannelLatestPost$).pipe(
                        map((results) => {
                            const latestByChannel = new Map<string, PostModel>();
                            for (let i = 0; i < results.length; i++) {
                                const arr = results[i];
                                const p = arr[0];
                                if (p) {
                                    latestByChannel.set(ids[i], p);
                                }
                            }
                            return latestByChannel;
                        }),
                    );
                }),
            );

            return combineLatest([allChannels, unreadIds, lastPosts, favoriteChannelIds]).pipe(
                map(([channels, unreads, posts, favorites]) => ({
                    allChannels: channels,
                    unreadIds: unreads,
                    lastPosts: posts,
                    favoriteChannelIds: favorites,
                })),
            );
        }),
    );
    /* eslint-enable max-nested-callbacks */

    const showIncomingCalls = observeIncomingCalls().pipe(
        switchMap((ics) => of$(ics.incomingCalls.length > 0)),
        distinctUntilChanged(),
    );

    const myTeams = queryMyTeams(database).observe();
    const nTeams = myTeams.pipe(
        map((teams) => teams.length),
        distinctUntilChanged(),
    );

    return {
        currentTeamId,
        currentUserId,
        threadsUnread: observeUnreadsAndMentions(database, {teamId: undefined as unknown as string, includeDmGm: true}),
        draftsCount: currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))),
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
        canJoinChannels,
        canCreateChannels: combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
            switchMap(([open, priv]: boolean[]) => of$(open || priv)),
        ),
        canInvitePeople: of$(true),
        allChannels: channelListData.pipe(map((data) => data.allChannels)),
        unreadIds: channelListData.pipe(map((data) => data.unreadIds)),
        lastPosts: channelListData.pipe(map((data) => data.lastPosts)),
        favoriteChannelIds: channelListData.pipe(map((data) => data.favoriteChannelIds)),
        showIncomingCalls,
        nTeams,
    };
});

export default withDatabase(enhanced(HomeDaakia));
