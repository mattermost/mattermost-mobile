// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelList from '@screens/home/channel_list';
import {useHomeScreenEffects} from '@screens/home/hooks/use_home_effects';

import type {LaunchProps} from '@typings/launch';

export default function HomeTab() {
    const props = usePropsFromParams<LaunchProps & {componentId?: string}>();

    // Run all the shared Home screen effects
    useHomeScreenEffects(props);

    return <ChannelList {...props}/>;
}
