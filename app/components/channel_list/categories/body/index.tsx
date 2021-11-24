// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

const renderChannelItem = (data: { item: TempoChannel }) => {
    return (
        <ChannelListItem
            icon={'globe'}
            name={data.item.name}
            highlight={data.item.highlight}
        />
    );
};

type Props = {
    channels: TempoChannel[];
};

const CategoryBody = (props: Props) => {
    return (
        <FlatList
            data={props.channels}
            renderItem={renderChannelItem}
        />
    );
};

export default CategoryBody;
