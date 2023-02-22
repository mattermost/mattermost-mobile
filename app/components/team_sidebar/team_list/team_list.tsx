// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedGestureHandler, useSharedValue} from 'react-native-reanimated';

import {handleTeamChange} from '@actions/remote/team';
import {useServerUrl} from '@app/context/server';

import TeamItem from './team_item';

import type MyTeamModel from '@typings/database/models/servers/my_team';
import type {Int32} from 'react-native/Libraries/Types/CodegenTypes';

type Props = {
	currentTeam: string;
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

export default function TeamList({myOrderedTeams, currentTeam, testID}: Props) {
    const swipePixelDistance = 50; //Random assumption, short to feel snappy, long enough to prevent false positives
    const swipeStartY = useSharedValue(0);
    const didSwipeFireAlready = useSharedValue(false);
    const serverUrl = useServerUrl();

    /**
	 * Switch to the next team in the myOrderedTeams list
	 * @param nextIndex index to jump: 1 = 1 down, -1 = 1 up
	 */
    function switchToNextTeam(nextIndex: Int32) {
        const currentTeamIdIndex = myOrderedTeams.findIndex((t) => t.id === currentTeam);
        if (currentTeamIdIndex >= 0) {
            let newTeamIndex = currentTeamIdIndex + nextIndex;

            //Handle out of bounce
            if (newTeamIndex >= myOrderedTeams.length) {
                newTeamIndex = 0;
            }
            if (newTeamIndex < 0) {
                newTeamIndex = myOrderedTeams.length - 1;
            }
            handleTeamChange(serverUrl, myOrderedTeams[newTeamIndex].id);
        } else {
            //current Team was not found in myOrderedTeams, we should error log.
            // console.error(`Current TeamID ${teamId.value} not found in myOrderedTeams`);
        }
    }

    const panGesture = useAnimatedGestureHandler({
        onStart: (event) => {
            //Reset to get a fresh start
            didSwipeFireAlready.value = false;
            swipeStartY.value = event.y;
        },
        onActive: (event) => {
            if (!didSwipeFireAlready.value && event.y > (swipeStartY.value + swipePixelDistance)) {
                //swiped down
                didSwipeFireAlready.value = true;
                runOnJS(switchToNextTeam)(1);
            }
            if (!didSwipeFireAlready.value && event.y < (swipeStartY.value - swipePixelDistance)) {
                //swiped up
                runOnJS(switchToNextTeam)(-1);
                didSwipeFireAlready.value = true;
            }
        },
    });

    return (
        <PanGestureHandler onGestureEvent={panGesture}>
            <Animated.View style={styles.container}>
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
            </Animated.View>
        </PanGestureHandler>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        alignItems: 'center',
        marginVertical: 6,
        paddingBottom: 10,
    },
});
