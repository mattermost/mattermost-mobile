// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Platform, StyleSheet} from 'react-native';

import Loading from '@components/loading';

import EmptyState from './empty_state';
import Header, {Tab} from './header';
import Thread from './thread';

import type ThreadModel from '@typings/database/models/servers/thread';

export type {Tab};

export type Props = {
    currentUserId: string;
    isLoading: boolean;
    setTab: (tab: Tab) => void;
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
    },
});

const ThreadsList = ({currentUserId, isLoading, setTab, tab, teamId, teammateNameDisplay, testID, theme, threads, unreadsCount}: Props) => {
    const intl = useIntl();

    const keyExtractor = useCallback((item: ThreadModel) => item.id, []);

    const renderEmptyList = () => {
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
    };

    const renderItem = useCallback(({item}) => (
        <Thread
            currentUserId={currentUserId}
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
                testID='TODO'
                theme={theme}
                unreadsCount={unreadsCount}
            />
            <FlatList
                contentContainerStyle={styles.messagesContainer}
                data={threads}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmptyList()}
                maxToRenderPerBatch={Platform.select({android: 5})}
                removeClippedSubviews={true}
                renderItem={renderItem}
            />
        </>
    );
};

export default ThreadsList;
