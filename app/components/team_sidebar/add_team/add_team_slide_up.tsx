// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';

import {Navigation} from '@app/constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Button from './button';
import TeamList from './team_list';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    otherTeams: TeamModel[];
    canCreateTeams: boolean;
}
export default function AddTeamSlideUp({otherTeams, canCreateTeams}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const onPressCreate = useCallback(() => {
        //TODO Create team screen
        DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
    }, []);

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.headerText}>{intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}</Text>
            </View>
            <TeamList teams={otherTeams}/>
            {canCreateTeams && (
                <>
                    <View style={styles.separator}/>
                    <Button
                        onPress={onPressCreate}
                        icon={'plus'}
                        text={intl.formatMessage({id: 'mobile.add_team.create_team', defaultMessage: 'Create a New Team'})}
                    />
                </>
            )}
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            backgroundColor: theme.centerChannelBg,
            height: '100%',
        },
        headerText: {
            color: theme.centerChannelColor,
            lineHeight: 30,
            fontSize: 25,
            fontWeight: 'bold',
        },
        separator: {
            height: 1,
            width: '100%',
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: 20,
        },
    };
});
