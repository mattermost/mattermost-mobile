// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet, View} from 'react-native';

import TeamItem from './team_item';

import type MyTeamModel from '@typings/database/models/servers/my_team';

type Props = {
    myTeams: MyTeamModel[];
}

const renderTeam = ({item: t}: ListRenderItemInfo<MyTeamModel>) => {
    return (
        <TeamItem
            myTeam={t}
        />
    );
};

export default function TeamList({myTeams}: Props) {
    return (
        <View style={styles.container}>
            <FlatList
                data={myTeams}
                renderItem={renderTeam}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contentContainer}
                fadingEdgeLength={36}
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
