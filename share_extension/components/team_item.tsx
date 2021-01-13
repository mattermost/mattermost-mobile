// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, TouchableHighlight, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TeamIcon from '@components/team_icon';
import {Preferences} from '@mm-redux/constants';
import {Team} from '@mm-redux/types/teams';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';

interface TeamItemProps {
    onSelect: (team: Team) => void;
    selected: boolean;
    team: Team;
}

const theme = Preferences.THEMES.default;

const TeamItem = ({onSelect, selected, team}: TeamItemProps) => {
    const onPress = preventDoubleTap(() => {
        onSelect(team);
    });

    let current;
    if (selected) {
        current = (
            <View style={styles.checkmarkContainer}>
                <CompassIcon
                    name='check'
                    style={styles.checkmark}
                />
            </View>
        );
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            onPress={onPress}
        >
            <View style={styles.container}>
                <View style={styles.item}>
                    <TeamIcon
                        testID='share_extension.team_item.team_icon'
                        teamId={team.id}
                        styleContainer={styles.teamIconContainer}
                        styleText={styles.teamIconText}
                        styleImage={styles.imageContainer}
                    />
                    <Text
                        style={styles.text}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {team.display_name}
                    </Text>
                    {current}
                </View>
            </View>
        </TouchableHighlight>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        height: 45,
        paddingHorizontal: 15,
    },
    item: {
        alignItems: 'center',
        height: 45,
        flex: 1,
        flexDirection: 'row',
    },
    text: {
        color: theme.centerChannelColor,
        flex: 1,
        fontSize: 16,
        paddingRight: 5,
    },
    teamIconContainer: {
        backgroundColor: theme.sidebarBg,
        marginRight: 10,
    },
    teamIconText: {
        color: theme.sidebarText,
    },
    imageContainer: {
        backgroundColor: '#ffffff',
    },
    checkmarkContainer: {
        alignItems: 'flex-end',
    },
    checkmark: {
        color: theme.linkColor,
        fontSize: 16,
    },
});

export default TeamItem;
