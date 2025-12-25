// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {ALL_TEAMS_ID} from '@constants/team';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import SearchStore from '@store/search_store';
import {navigateToScreen} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type TeamModel from '@typings/database/models/servers/team';

const MENU_DOWN_ICON_SIZE = 24;

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

    const handleTeamChange = usePreventDoubleTap(useCallback(() => {
        // Store data and callback in SearchStore
        SearchStore.setTeamPickerData({
            teamId,
            teams: teamList,
            crossTeamSearchEnabled,
            callback: setTeamId,
        });

        // Navigate to bottom sheet route
        navigateToScreen(Screens.SEARCH_TEAM_LIST);
    }, [teamId, teamList, crossTeamSearchEnabled, setTeamId]));

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
