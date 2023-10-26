// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import Button from '@components/button';

import {ChannelNameInput} from './channel_name_input';
import MessageBox from './message_box';
import {TeamSelector} from './team_selector';
import { logDebug } from '@app/utils/log';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingVertical: 24,
            paddingHorizontal: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
        },
    };
});

type Props = {
    commonTeams: Team[];
    profiles: UserProfile[];
}

export const ConvertGMToChannelForm = ({commonTeams, profiles}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const team = useRef<Team>();

    const {formatMessage} = useIntl();
    const confirmButtonText = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text',
        defaultMessage: 'Convert to Private Channel',
    });

    useEffect(() => {
        if (commonTeams.length === 1) {
            team.current = commonTeams[0];
        }
    }, [commonTeams]);

    const handleOnSelectTeam = useCallback((selectedTeam: Team) => {
        team.current = selectedTeam;
    }, []);

    return (
        <View style={styles.container}>
            <MessageBox
                profiles={profiles}
            />
            {
                commonTeams.length > 1 &&
                <TeamSelector
                    commonTeams={commonTeams}
                    onSelectTeam={handleOnSelectTeam}
                />
            }
            <ChannelNameInput/>
            <Button
                onPress={() => logDebug(`Selected team: ${team.current?.display_name}`)}
                text={confirmButtonText}
                theme={theme}
                buttonType='destructive'
                emphasis='primary'
                size='lg'
            />
        </View>
    );
};
