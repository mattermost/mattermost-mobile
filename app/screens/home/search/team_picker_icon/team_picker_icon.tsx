// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, useWindowDimensions} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectTeamSlideUp from './search_team_slideup';

import type TeamModel from '@typings/database/models/servers/team';

const ITEM_HEIGHT = 72;
const HEADER_HEIGHT = 66;
const CONTAINER_HEIGHT = 392;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        teamContainer: {
            paddingLeft: 12,
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
            marginLeft: 4,
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
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const styles = getStyleFromTheme(theme);
    const maxHeight = Math.round((dimensions.height * 0.9));

    const selectedTeam = teams.find((t) => t.id === teamId);

    const handleTeamChange = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <SelectTeamSlideUp
                    setTeamId={setTeamId}
                    teams={teams}
                    teamId={teamId}
                    showTitle={!isTablet && Boolean(teams.length)}
                />
            );
        };

        let height = CONTAINER_HEIGHT;
        if (teams.length) {
            height = Math.min(maxHeight, HEADER_HEIGHT + ((teams.length + 1) * ITEM_HEIGHT));
        }

        bottomSheet({
            closeButtonId: 'close-select-team',
            renderContent,
            snapPoints: [height, 10],
            theme,
            title: intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'}),
        });
    }), [theme, teamId]);

    return (
        <View>
            {selectedTeam &&
                <TouchableWithFeedback
                    onPress={handleTeamChange}
                    type='opacity'
                    testID={selectedTeam.id}
                >
                    <View style={[styles.teamContainer, divider ? styles.border : null]}>
                        <View style={[styles.teamIcon, {width: size, height: size}]}>
                            <TeamIcon
                                displayName={selectedTeam.displayName}
                                id={selectedTeam.id}
                                lastIconUpdate={selectedTeam.lastTeamIconUpdatedAt}
                                textColor={theme.centerChannelColor}
                                backgroundColor={changeOpacity(theme.centerChannelColor, 0.16)}
                                selected={false}
                                testID={`${selectedTeam}.team_icon`}
                            />
                        </View>
                        <CompassIcon
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            style={styles.compass}
                            name='menu-down'
                            size={24}
                        />
                    </View>
                </TouchableWithFeedback>
            }
        </View>
    );
};
export default TeamPickerIcon;
