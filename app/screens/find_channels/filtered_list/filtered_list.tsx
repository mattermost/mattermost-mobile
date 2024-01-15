// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce, type DebouncedFunc} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, FlatList, type ListRenderItemInfo, StyleSheet, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import {switchToGlobalThreads} from '@actions/local/thread';
import {joinChannelIfNeeded, makeDirectChannel, searchAllChannels, switchToChannelById} from '@actions/remote/channel';
import {searchProfiles} from '@actions/remote/user';
import ChannelItem from '@components/channel_item';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import ThreadsButton from '@components/threads_button';
import UserItem from '@components/user_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {sortChannelsByDisplayName} from '@utils/channel';
import {displayUsername} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

type ResultItem = ChannelModel|Channel|UserModel|'thread';

type RemoteChannels = {
    archived: Channel[];
    startWith: Channel[];
    matches: Channel[];
}

type Props = {
    archivedChannels: ChannelModel[];
    close: () => Promise<void>;
    channelsMatch: ChannelModel[];
    channelsMatchStart: ChannelModel[];
    currentTeamId: string;
    isCRTEnabled: boolean;
    keyboardOverlap: number;
    loading: boolean;
    onLoading: (loading: boolean) => void;
    restrictDirectMessage: boolean;
    showTeamName: boolean;
    teamIds: Set<string>;
    teammateDisplayNameSetting: string;
    term: string;
    usersMatch: UserModel[];
    usersMatchStart: UserModel[];
    testID?: string;
}

const style = StyleSheet.create({
    flex: {flex: 1},
    noResultContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export const MAX_RESULTS = 20;

const sortByLastPostAt = (a: Channel, b: Channel) => {
    return a.last_post_at > b.last_post_at ? 1 : -1;
};

const sortByUserOrChannel = <T extends Channel |UserModel>(locale: string, teammateDisplayNameSetting: string, a: T, b: T): number => {
    const aDisplayName = 'display_name' in a ? a.display_name : displayUsername(a, locale, teammateDisplayNameSetting);
    const bDisplayName = 'display_name' in b ? b.display_name : displayUsername(b, locale, teammateDisplayNameSetting);

    return aDisplayName.toLowerCase().localeCompare(bDisplayName.toLowerCase(), locale, {numeric: true});
};

const FilteredList = ({
    archivedChannels, close, channelsMatch, channelsMatchStart, currentTeamId,
    isCRTEnabled, keyboardOverlap, loading, onLoading, restrictDirectMessage, showTeamName,
    teamIds, teammateDisplayNameSetting, term, usersMatch, usersMatchStart, testID,
}: Props) => {
    const bounce = useRef<DebouncedFunc<() => void>>();
    const mounted = useRef(false);
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const {locale, formatMessage} = useIntl();
    const flatListStyle = useMemo(() => ({flexGrow: 1, paddingBottom: keyboardOverlap}), [keyboardOverlap]);
    const [remoteChannels, setRemoteChannels] = useState<RemoteChannels>({archived: [], startWith: [], matches: []});

    const totalLocalResults = channelsMatchStart.length + channelsMatch.length + usersMatchStart.length;

    const search = async () => {
        onLoading(true);
        if (mounted.current) {
            setRemoteChannels({archived: [], startWith: [], matches: []});
        }
        const lowerCasedTerm = (term.startsWith('@') ? term.substring(1) : term).toLowerCase();
        if ((channelsMatchStart.length + channelsMatch.length) < MAX_RESULTS) {
            if (restrictDirectMessage) {
                searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
            } else {
                searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
            }
        }

        if (!term.startsWith('@')) {
            if (totalLocalResults < MAX_RESULTS) {
                const {channels} = await searchAllChannels(serverUrl, lowerCasedTerm, true);
                if (channels) {
                    const existingChannelIds = new Set(channelsMatchStart.concat(channelsMatch).concat(archivedChannels).map((c) => c.id));
                    const [startWith, matches, archived] = channels.reduce<[Channel[], Channel[], Channel[]]>(([s, m, a], c) => {
                        if (existingChannelIds.has(c.id) || !teamIds.has(c.team_id)) {
                            return [s, m, a];
                        }
                        if (!c.delete_at) {
                            if (c.display_name.toLowerCase().startsWith(lowerCasedTerm)) {
                                return [[...s, c], m, a];
                            }
                            if (c.display_name.toLowerCase().includes(lowerCasedTerm)) {
                                return [s, [...m, c], a];
                            }
                            return [s, m, a];
                        }

                        if (c.display_name.toLowerCase().includes(lowerCasedTerm)) {
                            return [s, m, [...a, c]];
                        }

                        return [s, m, a];
                    }, [[], [], []]);

                    if (mounted.current) {
                        setRemoteChannels({
                            archived: archived.sort(sortChannelsByDisplayName.bind(null, locale)).slice(0, MAX_RESULTS + 1),
                            startWith: startWith.sort(sortByLastPostAt).slice(0, MAX_RESULTS + 1),
                            matches: matches.sort(sortChannelsByDisplayName.bind(null, locale)).slice(0, MAX_RESULTS + 1),
                        });
                    }
                }
            }
        }

        onLoading(false);
    };

    const onJoinChannel = useCallback(async (c: Channel | ChannelModel) => {
        const res = await joinChannelIfNeeded(serverUrl, c.id);
        const displayName = 'display_name' in c ? c.display_name : c.displayName;
        if ('error' in res) {
            Alert.alert(
                '',
                formatMessage({
                    id: 'mobile.join_channel.error',
                    defaultMessage: "We couldn't join the channel {displayName}.",
                }, {displayName}),
            );
            return;
        }

        await close();
        switchToChannelById(serverUrl, c.id, undefined, true);
    }, [serverUrl, close, locale]);

    const onOpenDirectMessage = useCallback(async (u: UserProfile | UserModel) => {
        const displayName = displayUsername(u, locale, teammateDisplayNameSetting);
        const {data, error} = await makeDirectChannel(serverUrl, u.id, displayName, false);
        if (error || !data) {
            Alert.alert(
                '',
                formatMessage({
                    id: 'mobile.direct_message.error',
                    defaultMessage: "We couldn't open a DM with {displayName}.",
                }, {displayName}),
            );
            return;
        }

        await close();
        switchToChannelById(serverUrl, data.id);
    }, [serverUrl, close, locale, teammateDisplayNameSetting]);

    const onSwitchToChannel = useCallback(async (c: Channel | ChannelModel) => {
        await close();
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl, close]);

    const onSwitchToThreads = useCallback(async () => {
        await close();
        switchToGlobalThreads(serverUrl);
    }, [serverUrl, close]);

    const renderEmpty = useCallback(() => {
        if (loading) {
            return (
                <Loading
                    containerStyle={style.noResultContainer}
                    size='large'
                    color={theme.buttonBg}
                />
            );
        }

        if (term) {
            return (
                <View style={style.noResultContainer}>
                    <NoResultsWithTerm term={term}/>
                </View>
            );
        }

        return null;
    }, [term, loading, theme]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ResultItem>) => {
        if (item === 'thread') {
            return (
                <ThreadsButton
                    onCenterBg={true}
                    onPress={onSwitchToThreads}
                />
            );
        }

        if ('teamId' in item) {
            return (
                <ChannelItem
                    channel={item}
                    isOnCenterBg={true}
                    onPress={onSwitchToChannel}
                    showTeamName={showTeamName}
                    shouldHighlightState={true}
                    testID='find_channels.filtered_list.channel_item'
                />
            );
        }

        if ('username' in item) {
            return (
                <UserItem
                    onUserPress={onOpenDirectMessage}
                    user={item}
                    testID='find_channels.filtered_list.user_item'
                    showBadges={true}
                />
            );
        }

        return (
            <ChannelItem
                channel={item}
                isOnCenterBg={true}
                onPress={onJoinChannel}
                showTeamName={showTeamName}
                shouldHighlightState={true}
                testID='find_channels.filtered_list.remote_channel_item'
            />
        );
    }, [onJoinChannel, onOpenDirectMessage, onSwitchToChannel, showTeamName, teammateDisplayNameSetting]);

    const threadLabel = useMemo(
        () => formatMessage({
            id: 'threads',
            defaultMessage: 'Threads',
        }).toLowerCase(),
        [locale],
    );

    const data = useMemo(() => {
        const items: ResultItem[] = [];

        // Add threads item to show it on the top of the list
        if (isCRTEnabled) {
            const isThreadTerm = threadLabel.indexOf(term.toLowerCase()) === 0;
            if (isThreadTerm) {
                items.push('thread');
            }
        }

        items.push(...channelsMatchStart);

        // Channels that matches
        if (items.length < MAX_RESULTS) {
            items.push(...channelsMatch);
        }

        // Users that start with
        if (items.length < MAX_RESULTS) {
            items.push(...usersMatchStart);
        }

        // Archived channels local
        if (items.length < MAX_RESULTS) {
            const archivedAlpha = archivedChannels.
                sort(sortChannelsByDisplayName.bind(null, locale));
            items.push(...archivedAlpha.slice(0, MAX_RESULTS + 1));
        }

        // Remote Channels that start with
        if (items.length < MAX_RESULTS) {
            items.push(...remoteChannels.startWith);
        }

        // Users & Channels that matches
        if (items.length < MAX_RESULTS) {
            const sortedByAlpha = [...usersMatch, ...remoteChannels.matches].
                sort(sortByUserOrChannel.bind(null, locale, teammateDisplayNameSetting));
            items.push(...sortedByAlpha.slice(0, MAX_RESULTS + 1));
        }

        // Archived channels
        if (items.length < MAX_RESULTS) {
            const archivedAlpha = remoteChannels.archived.
                sort(sortChannelsByDisplayName.bind(null, locale));
            items.push(...archivedAlpha.slice(0, MAX_RESULTS + 1));
        }

        return [...new Set(items)].slice(0, MAX_RESULTS + 1);
    }, [archivedChannels, channelsMatchStart, channelsMatch, isCRTEnabled, remoteChannels, usersMatch, usersMatchStart, locale, teammateDisplayNameSetting, term, threadLabel]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        bounce.current = debounce(search, 500);
        bounce.current();
        return () => {
            if (bounce.current) {
                bounce.current.cancel();
            }
        };
    }, [term]);

    return (
        <Animated.View
            entering={FadeInDown.duration(100)}
            exiting={FadeOutUp.duration(100)}
            style={style.flex}
        >
            <FlatList
                contentContainerStyle={flatListStyle}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                ListEmptyComponent={renderEmpty}
                renderItem={renderItem}
                data={data}
                showsVerticalScrollIndicator={false}
                testID={`${testID}.flat_list`}
            />
        </Animated.View>
    );
};

export default FilteredList;
