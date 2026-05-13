// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {type ListRenderItemInfo} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    reactions: ReactionModel[];
}

const ReactorsList = ({location, reactions}: Props) => {
    const serverUrl = useServerUrl();
    const renderItem = useCallback(({item}: ListRenderItemInfo<ReactionModel>) => (
        <Reactor
            location={location}
            reaction={item}
        />
    ), [location]);

    useDidMount(() => {
        const userIds = reactions.map((r) => r.userId);

        // Fetch any missing user
        fetchUsersByIds(serverUrl, userIds);
    });

    return (
        <BottomSheetFlatList
            data={reactions}
            renderItem={renderItem}
            overScrollMode={'always'}
            testID='reactions.reactors_list.flat_list'
        />
    );
};

export default ReactorsList;

