// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

type Props = {
    sortedIds: string[];
};

const ChannelItem = ({item}: {item: string}) => {
    return (
        <ChannelListItem channelId={item}/>
    );
};

const CategoryBody = ({sortedIds}: Props) => {
    return (
        <FlatList
            data={sortedIds}
            renderItem={ChannelItem}
        />
    );
};

export default CategoryBody;
