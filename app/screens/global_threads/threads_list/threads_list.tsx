// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Platform, StyleSheet} from 'react-native';

import {getThreads} from '@actions/remote/thread';
import {General} from '@app/constants';
import Loading from '@components/loading';

import EmptyState from './empty_state';
import EndOfList from './end_of_list';
import Header, {Tab} from './header';
import Thread from './thread';

import type ThreadModel from '@typings/database/models/servers/thread';

export type {Tab};

export type Props = {
    setTab: (tab: Tab) => void;
    serverUrl: string;
    tab: Tab;
    teamId: string;
    teammateNameDisplay: string;
    testID: string;
    threads: ThreadModel[];
    theme: Theme;
    unreadsCount: number;
};

const styles = StyleSheet.create({
    messagesContainer: {
        flexGrow: 1,
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
    serverUrl,
    teamId,
    teammateNameDisplay,
    testID,
    theme,
    threads,
    unreadsCount,
}: Props) => {
    const intl = useIntl();
    const hasCalled = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [endReached, setEndReached] = useState(false);

    const noThreads = !threads?.length;
    const lastThread = threads?.length ? threads[threads.length - 1] : null;

    useEffect(() => {
        // this is to be called only when there are no threads
        if (tab === 'all' && noThreads && !hasCalled.current) {
            setIsLoading(true);
            getThreads(serverUrl, teamId).finally(() => {
                hasCalled.current = true;
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, [serverUrl, tab, noThreads, teamId]);

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
            <EmptyState
                intl={intl}
                isUnreads={tab === 'unreads'}
                theme={theme}
            />
        );
    }, [theme, tab, isLoading]);

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

    const handleEndReached = useCallback(() => {
        if (!lastThread || tab === 'unreads' || endReached) {
            return;
        }

        const options = {
            before: lastThread.id,
            perPage: General.CRT_CHUNK_SIZE,
        };

        setIsLoading(true);
        getThreads(serverUrl, teamId, options).then((response) => {
            if ('data' in response) {
                setEndReached(response.data.threads.length < General.CRT_CHUNK_SIZE);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [lastThread?.id, tab, endReached]);

    const renderItem = useCallback(({item}) => (
        <Thread
            testID={testID}
            teammateNameDisplay={teammateNameDisplay}
            thread={item}
            theme={theme}
        />
    ), [theme]);

    return (
        <>
            <Header
                setTab={setTab}
                tab={tab}
                teamId={teamId}
                testID={testID}
                theme={theme}
                unreadsCount={unreadsCount}
            />
            <FlatList
                contentContainerStyle={styles.messagesContainer}
                data={threads}
                ListEmptyComponent={listEmptyComponent}
                ListFooterComponent={listFooterComponent}
                maxToRenderPerBatch={Platform.select({android: 5})}
                onEndReached={handleEndReached}
                removeClippedSubviews={true}
                renderItem={renderItem}
            />
        </>
    );
};

export default ThreadsList;
