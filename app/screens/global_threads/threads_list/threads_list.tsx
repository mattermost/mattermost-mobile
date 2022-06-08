// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {FlatList, StyleSheet} from 'react-native';

import {fetchRefreshThreads, fetchThreads} from '@actions/remote/thread';
import Loading from '@components/loading';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

import EmptyState from './empty_state';
import EndOfList from './end_of_list';
import Header from './header';
import Thread from './thread';

import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    setTab: (tab: GlobalThreadsTab) => void;
    tab: GlobalThreadsTab;
    teamId: string;
    teammateNameDisplay: string;
    testID: string;
    threads: ThreadModel[];
    unreadsCount: number;
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
    setTab,
    tab,
    teamId,
    teammateNameDisplay,
    testID,
    threads,
    unreadsCount,
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
        // this is to be called only when there are no threads
        if (tab === 'all' && noThreads && !hasFetchedOnce.current) {
            setIsLoading(true);
            fetchThreads(serverUrl, teamId).finally(() => {
                hasFetchedOnce.current = true;
                setIsLoading(false);
            });
        }
    }, [noThreads, tab]);

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

    const listFooterComponent = useMemo(() => {
        if (tab === 'unreads' || !threads.length) {
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
    }, [isLoading, tab, theme, endReached]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);

        fetchRefreshThreads(serverUrl, teamId, tab === 'unreads').finally(() => {
            setRefreshing(false);
        });
    }, [serverUrl, teamId]);

    const handleEndReached = useCallback(() => {
        if (!lastThread || tab === 'unreads' || endReached) {
            return;
        }

        const options = {
            before: lastThread.id,
            perPage: General.CRT_CHUNK_SIZE,
        };

        setIsLoading(true);
        fetchThreads(serverUrl, teamId, options).then((response) => {
            if ('data' in response) {
                setEndReached(response.data.threads.length < General.CRT_CHUNK_SIZE);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [endReached, lastThread?.id, serverUrl, tab, teamId]);

    const renderItem = useCallback(({item}) => (
        <Thread
            location={Screens.GLOBAL_THREADS}
            testID={testID}
            teammateNameDisplay={teammateNameDisplay}
            thread={item}
        />
    ), [teammateNameDisplay, testID]);

    return (
        <>
            <Header
                setTab={setTab}
                tab={tab}
                teamId={teamId}
                testID={`${testID}.header`}
                unreadsCount={unreadsCount}
            />
            <FlatList
                ListEmptyComponent={listEmptyComponent}
                ListFooterComponent={listFooterComponent}
                contentContainerStyle={threads.length ? styles.messagesContainer : styles.empty}
                data={threads}
                maxToRenderPerBatch={10}
                onEndReached={handleEndReached}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                removeClippedSubviews={true}
                renderItem={renderItem}
                testID={`${testID}.flat_list`}
            />
        </>
    );
};

export default ThreadsList;
