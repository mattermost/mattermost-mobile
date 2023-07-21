// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, type ListRenderItemInfo, StyleSheet, View} from 'react-native';

import TeamItem from './team_item';

import type MyTeamModel from '@typings/database/models/servers/my_team';

type Props = {
    myOrderedTeams: MyTeamModel[];
    testID?: string;
}

const keyExtractor = (item: MyTeamModel) => item.id;

const renderTeam = ({item: t}: ListRenderItemInfo<MyTeamModel>) => {
    return (
        <TeamItem
            myTeam={t}
        />
    );
};

export default function TeamList({myOrderedTeams, testID}: Props) {
    return (
        <View style={styles.container}>
            <FlatList
                bounces={false}
                contentContainerStyle={styles.contentContainer}
                data={myOrderedTeams}
                fadingEdgeLength={30}
                keyExtractor={keyExtractor}
                renderItem={renderTeam}
                showsVerticalScrollIndicator={false}
                testID={`${testID}.flat_list`}
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
        paddingBottom: 10,
    },
});
