// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useCallback, useState } from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@app/components/option_item';
import {Screens} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {dismissBottomSheet, goToScreen} from '@app/screens/navigation';
import {preventDoubleTap} from '@app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        teamSelector: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

type Props = {
    commonTeams: Team[];
}

export const TeamSelector = ({commonTeams}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const [selectedTeam, setSelectedTeam] = useState<Team>();

    const label = formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.label', defaultMessage: 'Team'});
    const placeholder = formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.placeholder', defaultMessage: 'Select a Team'});

    const selectTeam = useCallback((teamId: string) => {
        const team = commonTeams.find((t) => t.id === teamId);
        if (team) {
            setSelectedTeam(team);
        }
    }, []);

    const goToTeamSelectorList = preventDoubleTap(async () => {
        await dismissBottomSheet();

        const title = formatMessage({id: 'channel_info.convert_gm_to_channel.team_selector_list.title', defaultMessage: 'Select Team'});
        goToScreen(Screens.TEAM_SELECTOR_LIST, title, {teams: commonTeams, selectTeam});
    });

    return (
        <OptionItem
            action={goToTeamSelectorList}
            containerStyle={styles.teamSelector}
            label={label}
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={selectedTeam ? selectedTeam.display_name : placeholder}
            labelContainerStyle={{flexShrink: 0}}
        />
    );
};
