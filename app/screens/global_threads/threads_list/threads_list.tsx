// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {FlatList, type ListRenderItemInfo, StyleSheet} from 'react-native';

import {loadEarlierThreads, syncTeamThreads} from '@actions/remote/thread';
import Loading from '@components/loading';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

import EmptyState from './empty_state';
import EndOfList from './end_of_list';
import Thread from './thread';

import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    tab: GlobalThreadsTab;
    teamId: string;
    teammateNameDisplay: string;
    testID: string;
    threads: ThreadModel[];
    flatListRef: React.RefObject<FlatList<ThreadModel>>;
};

const styles = StyleSheet.create({
    messagesContainer: {
        flexGrow: 1,
    },
    empty: {
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
    loadingStyle: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 8,
    },
});

const ThreadsList = ({
    tab,
    teamId,
    teammateNameDisplay,
    testID,
    threads,
    flatListRef,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const hasFetchedOnce = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [endReached, setEndReached] = useState(false);
    const [isRefreshing, setRefreshing] = useState(false);

    const noThreads = !threads?.length;
    const lastThread = threads?.length > 0 ? threads[threads.length - 1] : null;

    useEffect(() => {
        if (hasFetchedOnce.current || tab !== 'all') {
            return;
        }

        // Display loading only when there are no threads
        if (!noThreads) {
            setIsLoading(true);
        }
        syncTeamThreads(serverUrl, teamId).then(() => {
            hasFetchedOnce.current = true;
        });
        if (!noThreads) {
            setIsLoading(false);
        }
    }, [noThreads, serverUrl, tab, teamId]);

    const listEmptyComponent = useMemo(() => {
        if (isLoading) {
            return (
                <Loading
                    color={theme.buttonBg}
                    containerStyle={styles.loadingStyle}
                />
            );
        }
        return (
            <EmptyState isUnreads={tab === 'unreads'}/>
        );
    }, [isLoading, theme, tab]);

    const hasThreads = threads.length > 0;

    const listFooterComponent = useMemo(() => {
        if (tab === 'unreads' || !hasThreads) {
            return null;
        }

        if (endReached) {
            return (
                <EndOfList/>
            );
        } else if (isLoading) {
            return (
                <Loading
                    color={theme.buttonBg}
                    containerStyle={styles.loadingStyle}
                />
            );
        }

        return null;
    }, [tab, hasThreads, endReached, isLoading, theme.buttonBg]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);

        syncTeamThreads(serverUrl, teamId, {refresh: true}).finally(() => {
            setRefreshing(false);
        });
    }, [serverUrl, teamId]);

    const handleEndReached = useCallback(() => {
        if (tab === 'unreads' || endReached || !lastThread) {
            return;
        }

        setIsLoading(true);
        loadEarlierThreads(serverUrl, teamId, lastThread.id).then((response) => {
            if (response.threads) {
                setEndReached(response.threads.length < General.CRT_CHUNK_SIZE);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [endReached, serverUrl, tab, teamId, lastThread]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ThreadModel>) => (
        <Thread
            location={Screens.GLOBAL_THREADS}
            key={item.id}
            testID={testID}
            teammateNameDisplay={teammateNameDisplay}
            thread={item}
        />
    ), [teammateNameDisplay, testID]);

    return (
        <FlatList
            ListEmptyComponent={listEmptyComponent}
            ListFooterComponent={listFooterComponent}
            contentContainerStyle={threads.length ? styles.messagesContainer : styles.empty}
            data={threads}
            maxToRenderPerBatch={10}
            onEndReached={handleEndReached}
            onRefresh={handleRefresh}
            ref={flatListRef}
            refreshing={isRefreshing}
            removeClippedSubviews={true}
            renderItem={renderItem}
            testID={`${testID}.flat_list`}
        />
    );
};

export default ThreadsList;
