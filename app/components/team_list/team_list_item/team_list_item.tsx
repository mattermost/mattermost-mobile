// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    team: TeamModel | Team;
    textColor?: string;
    iconTextColor?: string;
    iconBackgroundColor?: string;
    selectedTeamId?: string;
    onPress: (teamId: string) => void;
    hideIcon?: boolean;
}

export const ITEM_HEIGHT = 56;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        touchable: {
            height: ITEM_HEIGHT,
            display: 'flex',
            flexDirection: 'row',
            borderRadius: 4,
            alignItems: 'center',
            width: '100%',
        },
        text: {
            color: theme.centerChannelColor,
            marginLeft: 16,
            flex: 1,
            ...typography('Body', 200),
        },
        icon_container: {
            width: 40,
            height: 40,
        },
        compassContainer: {
            alignItems: 'flex-end',
        },
    };
});

export default function TeamListItem({team, textColor, iconTextColor, iconBackgroundColor, selectedTeamId, onPress, hideIcon}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const displayName = 'displayName' in team ? team.displayName : team.display_name;
    const lastTeamIconUpdateAt = 'lastTeamIconUpdatedAt' in team ? team.lastTeamIconUpdatedAt : team.last_team_icon_update;
    const teamListItemTestId = `team_sidebar.team_list.team_list_item.${team.id}`;

    const showIcon = !hideIcon;

    const handlePress = useCallback(() => {
        onPress(team.id);
    }, [team.id, onPress]);

    return (
        <TouchableWithFeedback
            onPress={handlePress}
            type='opacity'
            style={styles.touchable}
        >
            {showIcon &&
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
            }
            <Text
                style={[styles.text, Boolean(textColor) && {color: textColor}]}
                numberOfLines={1}
                testID={`${teamListItemTestId}.team_display_name`}
            >
                {displayName}
            </Text>
            {(team.id === selectedTeamId) &&
            <View style={styles.compassContainer}>
                <CompassIcon
                    color={theme.buttonBg}
                    name='check'
                    size={24}
                />
            </View>
            }
        </TouchableWithFeedback>
    );
}
