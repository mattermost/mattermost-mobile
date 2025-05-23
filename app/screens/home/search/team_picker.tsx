// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ALL_TEAMS_ID} from '@constants/team';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BottomSheetTeamList from './bottom_sheet_team_list';

import type TeamModel from '@typings/database/models/servers/team';

const MENU_DOWN_ICON_SIZE = 24;
const NO_TEAMS_HEIGHT = 392;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        teamPicker: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
        },
        container: {
            flex: 1,
        },
        teamName: {
            color: theme.centerChannelColor,
            fontSize: 12,
            textAlign: 'right',
        },
    };
});

type Props = {
    teams: TeamModel[];
    setTeamId: (id: string) => void;
    teamId: string;
    crossTeamSearchEnabled: boolean;
}
const TeamPicker = ({setTeamId, teams, teamId, crossTeamSearchEnabled}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const AllTeams: TeamModel = useMemo(() => ({id: ALL_TEAMS_ID, displayName: intl.formatMessage({id: 'mobile.search.team.all_teams', defaultMessage: 'All teams'})} as TeamModel), [intl]);

    const teamList = useMemo(() => {
        const list = [...teams];
        if (crossTeamSearchEnabled) {
            list.unshift(AllTeams);
        }
        return list;
    }, [teams, crossTeamSearchEnabled, AllTeams]);

    const selectedTeam = teamList.find((t) => t.id === teamId);

    const title = intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'});

    const handleTeamChange = usePreventDoubleTap(useCallback(() => {
        const renderContent = () => {
            return (
                <BottomSheetTeamList
                    setTeamId={setTeamId}
                    teams={teamList}
                    teamId={teamId}
                    title={title}
                    crossTeamSearchEnabled={crossTeamSearchEnabled}
                />
            );
        };

        const snapPoints: Array<string | number> = [
            1,

            // use teams to check if teams is empty
            teams.length ? bottomSheetSnapPoint(Math.min(3, teamList.length), ITEM_HEIGHT) + (2 * TITLE_HEIGHT) : NO_TEAMS_HEIGHT,
        ];

        if (teamList.length > 3) {
            snapPoints.push('80%');
        }

        bottomSheet({
            closeButtonId: 'close-team_list',
            renderContent,
            snapPoints,
            theme,
            title,
        });
    }, [teams, teamList, theme, title, setTeamId, teamId, crossTeamSearchEnabled]));

    return (
        <>
            {selectedTeam &&
                <TouchableWithFeedback
                    onPress={handleTeamChange}
                    type='opacity'
                    testID='team_picker.button'
                    style={styles.teamPicker}
                >
                    <View style={styles.container}>
                        <Text
                            id={selectedTeam.id}
                            numberOfLines={1}
                            style={styles.teamName}
                        >{selectedTeam.displayName}</Text>
                    </View>
                    <View>
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
