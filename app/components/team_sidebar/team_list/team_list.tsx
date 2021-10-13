// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet, View} from 'react-native';

import TeamItem from './team_item';

import type MyTeamModel from '@typings/database/models/servers/my_team';

type Props = {
    myOrderedTeams: MyTeamModel[];
}

const keyExtractor = (item: MyTeamModel) => item.id;

const renderTeam = ({item: t}: ListRenderItemInfo<MyTeamModel>) => {
    return (
        <TeamItem
            myTeam={t}
        />
    );
};

export default function TeamList({myOrderedTeams}: Props) {
    return (
        <View style={styles.container}>
            <FlatList
                bounces={false}
                contentContainerStyle={styles.contentContainer}
                data={myOrderedTeams}
                fadingEdgeLength={36}
                keyExtractor={keyExtractor}
                renderItem={renderTeam}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexShrink: 1,
    },
    contentContainer: {
        alignItems: 'center',
        marginVertical: 6,
    },
});
