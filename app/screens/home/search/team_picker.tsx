// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BottomSheetTeamList from './bottom_sheet_team_list';

import {ALL_TEAMS_ID} from '.';

import type TeamModel from '@typings/database/models/servers/team';

const MENU_DOWN_ICON_SIZE = 24;
const NO_TEAMS_HEIGHT = 392;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        teamContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
        },
        teamName: {
            color: theme.centerChannelColor,
            fontSize: 12,
        },
    };
});

type Props = {
    teams: TeamModel[];
    setTeamId: (id: string) => void;
    teamId: string;
}
const TeamPicker = ({setTeamId, teams, teamId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    let selectedTeam = teams.find((t) => t.id === teamId);
    if (teamId === ALL_TEAMS_ID) {
        selectedTeam = {id: ALL_TEAMS_ID, displayName: intl.formatMessage({id: 'mobile.search.team.all_teams', defaultMessage: 'All teams'})} as TeamModel;
    }

    const title = intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'});

    const handleTeamChange = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <BottomSheetTeamList
                    setTeamId={setTeamId}
                    teams={teams}
                    teamId={teamId}
                    title={title}
                />
            );
        };

        const snapPoints: Array<string | number> = [
            1,
            teams.length ? bottomSheetSnapPoint(Math.min(3, teams.length), ITEM_HEIGHT) + (2 * TITLE_HEIGHT) : NO_TEAMS_HEIGHT,
        ];

        if (teams.length > 3) {
            snapPoints.push('80%');
        }

        bottomSheet({
            closeButtonId: 'close-team_list',
            renderContent,
            snapPoints,
            theme,
            title,
        });
    }), [theme, setTeamId, teamId, teams]);

    return (
        <>
            {selectedTeam &&
                <TouchableWithFeedback
                    onPress={handleTeamChange}
                    type='opacity'
                    testID='team_picker.button'
                >
                    <View style={[styles.teamContainer]}>
                        <Text
                            id={selectedTeam.id}
                            numberOfLines={1}
                            style={styles.teamName}
                        >{selectedTeam.displayName}</Text>
                        <CompassIcon
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            name='menu-down'
                            size={MENU_DOWN_ICON_SIZE}
                        />
                    </View>
                </TouchableWithFeedback>
            }
        </>
    );
};
export default TeamPicker;
