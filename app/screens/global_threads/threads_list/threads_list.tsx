// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import {ThreadModel} from '@app/database/models/server';

import Header, {Tab} from './header';
import Thread from './thread';

export type {Tab};

export type Props = {
    currentUserId: string;
    setTab: (tab: Tab) => void;
    tab: Tab;
    teammateNameDisplay: string;
    testID: string;
    threads: ThreadModel[];
    theme: Theme;
    unreadsCount: number;
};

const ThreadsList = ({currentUserId, setTab, tab, teammateNameDisplay, testID, theme, threads, unreadsCount}: Props) => {
    const keyExtractor = useCallback((item: ThreadModel) => item.id, []);

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
                markAllAsRead={() => null}
                setTab={setTab}
                tab={tab}
                testID='TODO'
                theme={theme}
                unreadsCount={unreadsCount}
            />
            <FlatList
                data={threads}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
            />
        </>
    );
};

export default ThreadsList;
