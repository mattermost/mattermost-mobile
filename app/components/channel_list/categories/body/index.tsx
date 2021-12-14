// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

const renderChannelItem = (data: { item: ChannelModel }) => {
    return (
        <ChannelListItem
            icon={'globe'}
            name={data.item.displayName}

            // highlight={data.item.is}
        />
    );
};

type Props = {
    channels: ChannelModel[];
};

const CategoryBody = (props: Props) => {
    return (
        <FlatList
            data={props.channels}
            renderItem={renderChannelItem}
        />
    );
};

const enhanced = withObservables(['category'], ({category}: {category: CategoryModel}) => ({
    channels: category.channels,
}));

export default enhanced(CategoryBody);
