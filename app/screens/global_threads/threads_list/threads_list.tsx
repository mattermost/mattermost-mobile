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

const ThreadsList = ({isLoading, setTab, tab, teamId, teammateNameDisplay, testID, theme, threads, unreadsCount}: Props) => {
    const intl = useIntl();

    const keyExtractor = useCallback((item: ThreadModel) => item.id, []);

    const renderItem = useCallback(({item}) => (
        <Thread
            testID={testID}
            teammateNameDisplay={teammateNameDisplay}
            thread={item}
            theme={theme}
        />
    ), [theme]);

    let listEmptyComponent;
    if (isLoading) {
        listEmptyComponent = (
            <Loading
                color={theme.buttonBg}
                containerStyle={styles.loadingStyle}
            />
        );
    } else {
        listEmptyComponent = (
            <EmptyState
                intl={intl}
                isUnreads={tab === 'unreads'}
                theme={theme}
            />
        );
    }

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
                keyExtractor={keyExtractor}
                ListEmptyComponent={listEmptyComponent}
                maxToRenderPerBatch={Platform.select({android: 5})}
                removeClippedSubviews={true}
                renderItem={renderItem}
            />
        </>
    );
};

export default ThreadsList;
