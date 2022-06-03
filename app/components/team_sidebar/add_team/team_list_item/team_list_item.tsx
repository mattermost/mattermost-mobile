// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import {addUserToTeam} from '@actions/remote/team';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    team: TeamModel | Team;
    currentUserId: string;
    textColor?: string;
    iconTextColor?: string;
    iconBackgroundColor?: string;
    onTeamAdded: (teamId: string) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 64,
            marginBottom: 2,
        },
        touchable: {
            display: 'flex',
            flexDirection: 'row',
            borderRadius: 4,
            alignItems: 'center',
            height: '100%',
            width: '100%',
        },
        text: {
            color: theme.centerChannelColor,
            marginLeft: 16,
            ...typography('Body', 200),
        },
        icon_container: {
            width: 40,
            height: 40,
        },
    };
});

export default function TeamListItem({team, currentUserId, textColor, iconTextColor, iconBackgroundColor, onTeamAdded}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const onPress = useCallback(async () => {
        const {error} = await addUserToTeam(serverUrl, team.id, currentUserId);
        if (!error) {
            onTeamAdded(team.id);
        }
    }, [onTeamAdded]);

    const displayName = 'displayName' in team ? team.displayName : team.display_name;
    const lastTeamIconUpdateAt = 'lastTeamIconUpdatedAt' in team ? team.lastTeamIconUpdatedAt : team.last_team_icon_update;
    const teamListItemTestId = `team_sidebar.team_list.team_list_item.${team.id}`;

    return (
        <View style={styles.container}>
            <TouchableWithFeedback
                onPress={onPress}
                type='opacity'
                style={styles.touchable}
            >
                <View style={styles.icon_container}>
                    <TeamIcon
                        id={team.id}
                        displayName={displayName}
                        lastIconUpdate={lastTeamIconUpdateAt}
                        selected={false}
                        textColor={iconTextColor || theme.centerChannelColor}
                        backgroundColor={iconBackgroundColor || changeOpacity(theme.centerChannelColor, 0.16)}
                        testID={`${teamListItemTestId}.team_icon`}
                    />
                </View>
                <Text
                    style={[styles.text, textColor && {color: textColor}]}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
            </TouchableWithFeedback>
        </View>
    );
}
