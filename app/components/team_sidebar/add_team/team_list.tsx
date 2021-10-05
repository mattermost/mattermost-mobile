// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {ListRenderItemInfo, StyleSheet, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import TeamListItem from './team_list_item';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    teams: TeamModel[];
}

const renderTeam = ({item: t}: ListRenderItemInfo<TeamModel>) => {
    return (
        <TeamListItem
            team={t}
        />
    );
};

export default function TeamList({teams}: Props) {
    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                renderItem={renderTeam}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contentContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexShrink: 1,
    },
    contentContainer: {
        marginVertical: 4,
    },
});
