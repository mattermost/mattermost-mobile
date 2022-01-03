// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import ListHeader from './list_header';
import ListItem from './list_item';

type Props = {
    testID: string;
    theme: Theme;
};

const List = ({testID, theme}: Props) => {
    const keyExtractor = useCallback((item, index) => index.toString(), []);
    const renderItem = useCallback(({item}) => (
        <ListItem
            testID={testID}
            theme={theme}
        />
    ), [theme]);
    return (
        <>
            <ListHeader theme={theme}/>
            <FlatList
                data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
            />
        </>
    );
};

export default List;
