// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';

import ChannelItem from '@app/components/channel_item';

import {Section} from './categories';

import type ChannelModel from '@typings/database/models/servers/channel';

const Item = ({item, section}: {item: ChannelModel; section: Section}) => {
    const onChannelSwitch = () => {};

    return (
        <ChannelItem
            channel={item}
            collapsed={section.category.collapsed}
            testID={`category.${section.category.displayName.replace(/ /g, '_').toLocaleLowerCase()}.channel_list_item`}
            onPress={onChannelSwitch}
        />
    );
};

type EnhancedProps = {
     item: ChannelModel;
     section: Section;
}

const enhanced = withObservables(['item', 'section'], ({item, section}: EnhancedProps) => ({
    item,
    section,
}));

export default withDatabase(enhanced(Item));
