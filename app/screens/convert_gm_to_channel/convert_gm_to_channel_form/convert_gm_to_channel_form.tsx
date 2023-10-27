// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {logDebug} from '@app/utils/log';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import {displayUsername} from '@app/utils/user';
import Button from '@components/button';

import {ChannelNameInput} from '../channel_name_input';
import MessageBox from '../message_box/message_box';
import {TeamSelector} from '../team_selector';

import {NoCommonTeamForm} from './no_common_teams_form';

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
    locale?: string;
    teammateNameDisplay: string;
}

export const ConvertGMToChannelForm = ({
    commonTeams,
    profiles,
    locale,
    teammateNameDisplay,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const team = useRef<Team>();

    const {formatMessage} = useIntl();
    const confirmButtonText = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text',
        defaultMessage: 'Convert to Private Channel',
    });

    useEffect(() => {
        if (commonTeams.length > 0) {
            team.current = commonTeams[0];
        }
    }, [commonTeams]);

    const handleOnSelectTeam = useCallback((selectedTeam: Team) => {
        team.current = selectedTeam;
    }, []);

    const handleOnPress = useCallback(() => {
        logDebug(1);
    }, []);

    const intl = useIntl();
    const messageBoxHeader = intl.formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.header',
        defaultMessage: 'Conversation history will be visible to any channel members',
    });

    const userDisplayNames = profiles.map((profile) => displayUsername(profile, locale, teammateNameDisplay));
    const defaultUserDisplayNames = intl.formatMessage({id: 'channel_info.convert_gm_to_channel.warning.body.yourself', defaultMessage: 'yourself'});

    const memberNames = profiles.length > 0 ? intl.formatList(userDisplayNames) : defaultUserDisplayNames;

    const messageBoxBody = intl.formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.bodyXXXX',
        defaultMessage: 'You are about to convert the Group Message with {memberNames} to a Channel. This cannot be undone.',
    }, {
        memberNames,
    });

    if (commonTeams.length === 0) {
        return (
            <NoCommonTeamForm containerStyles={styles.container}/>
        );
    }

    return (
        <View style={styles.container}>
            <MessageBox
                header={messageBoxHeader}
                body={messageBoxBody}
            />
            {
                commonTeams.length > 1 &&
                <TeamSelector
                    commonTeams={commonTeams}
                    onSelectTeam={handleOnSelectTeam}
                    selectedTeamId={team.current?.id}
                />
            }
            <ChannelNameInput/>
            <Button
                onPress={handleOnPress}
                text={confirmButtonText}
                theme={theme}
                buttonType='destructive'
                size='lg'
            />
        </View>
    );
};
