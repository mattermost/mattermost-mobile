// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BottomSheetTeamList from './bottom_sheet_team_list';

import type TeamModel from '@typings/database/models/servers/team';

const MENU_DOWN_ICON_SIZE = 24;
const NO_TEAMS_HEIGHT = 392;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        teamContainer: {
            paddingLeft: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        border: {
            marginLeft: 12,
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        teamIcon: {
            flexDirection: 'row',
        },
        compass: {
            alignItems: 'center',
            marginLeft: 0,
        },
    };
});

type Props = {
    size?: number;
    divider?: boolean;
    teams: TeamModel[];
    setTeamId: (id: string) => void;
    teamId: string;
}
const TeamPickerIcon = ({size = 24, divider = false, setTeamId, teams, teamId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const {bottom} = useSafeAreaInsets();

    const selectedTeam = teams.find((t) => t.id === teamId);

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
            teams.length ? (bottomSheetSnapPoint(Math.min(3, teams.length), ITEM_HEIGHT, bottom) + TITLE_HEIGHT) : NO_TEAMS_HEIGHT,
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
    }), [theme, setTeamId, teamId, teams, bottom]);

    return (
        <>
            {selectedTeam &&
                <TouchableWithFeedback
                    onPress={handleTeamChange}
                    type='opacity'
                    testID='team_picker.button'
                >
                    <View style={[styles.teamContainer, divider && styles.border]}>
                        <View style={[styles.teamIcon, {width: size, height: size}]}>
                            <TeamIcon
                                displayName={selectedTeam.displayName}
                                id={selectedTeam.id}
                                lastIconUpdate={selectedTeam.lastTeamIconUpdatedAt}
                                textColor={theme.centerChannelColor}
                                backgroundColor={changeOpacity(theme.centerChannelColor, 0.16)}
                                selected={false}
                                testID={`team_picker.${selectedTeam.id}.team_icon`}
                                smallText={true}
                            />
                        </View>
                        <CompassIcon
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            style={styles.compass}
                            name='menu-down'
                            size={MENU_DOWN_ICON_SIZE}
                        />
                    </View>
                </TouchableWithFeedback>
            }
        </>
    );
};
export default TeamPickerIcon;
