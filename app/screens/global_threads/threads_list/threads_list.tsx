// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import {ThreadModel} from '@app/database/models/server';

// import Header from './header';
import Thread from './thread';

export type Props = {
    currentUserId: string;
    teamId: string;
    teammateNameDisplay: string;
    testID: string;
    threads: ThreadModel[];
    theme: Theme;
};

const ThreadsList = ({currentUserId, teammateNameDisplay, testID, theme, threads}: Props) => {
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
            {/* <Header theme={theme}/> */}
            <FlatList
                data={threads}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
            />
        </>
    );
};

export default ThreadsList;
