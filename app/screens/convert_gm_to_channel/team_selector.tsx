// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';

import MenuDivider from '@components/menu_divider';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';

type Props = {
    commonTeams: Team[];
    onSelectTeam: (team: Team) => void;
    selectedTeamId?: string;
}

export const TeamSelector = ({commonTeams, onSelectTeam, selectedTeamId}: Props) => {
    const {formatMessage} = useIntl();

    const label = formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.label', defaultMessage: 'Team'});
    const placeholder = formatMessage({id: 'channel_into.convert_gm_to_channel.team_selector.placeholder', defaultMessage: 'Select a Team'});

    const selectedTeam = useMemo(() => commonTeams.find((t) => t.id === selectedTeamId), [commonTeams, selectedTeamId]);

    const selectTeam = useCallback((teamId: string) => {
        const team = commonTeams.find((t) => t.id === teamId);
        if (team) {
            onSelectTeam(team);
        }
    }, [commonTeams, onSelectTeam]);

    const goToTeamSelectorList = usePreventDoubleTap(useCallback(async () => {
        await dismissBottomSheet();
        const title = formatMessage({id: 'channel_info.convert_gm_to_channel.team_selector_list.title', defaultMessage: 'Select Team'});
        goToScreen(Screens.TEAM_SELECTOR_LIST, title, {teams: commonTeams, selectTeam, selectedTeamId});
    }, [commonTeams, formatMessage, selectTeam, selectedTeamId]));

    return (
        <View>
            <MenuDivider
                marginTop={0}
                marginBottom={0}
            />
            <OptionItem
                action={goToTeamSelectorList}
                label={label}
                type={Platform.select({ios: 'arrow', default: 'default'})}
                info={selectedTeam ? selectedTeam.display_name : placeholder}
                longInfo={true}
            />
            <MenuDivider
                marginTop={0}
                marginBottom={0}
            />
        </View>
    );
};
