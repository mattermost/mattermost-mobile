// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {convertGroupMessageToPrivateChannel, switchToChannelById} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {logError} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';
import Button from '@components/button';

import {ChannelNameInput} from '../channel_name_input';
import MessageBox from '../message_box/message_box';
import {TeamSelector} from '../team_selector';

import {NoCommonTeamForm} from './no_common_teams_form';

const getStyleFromTheme = makeStyleSheetFromTheme(() => {
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
    channelId: string;
    commonTeams: Team[];
    profiles: UserProfile[];
    locale?: string;
    teammateNameDisplay?: string;
}

export const ConvertGMToChannelForm = ({
    channelId,
    commonTeams,
    profiles,
    locale,
    teammateNameDisplay,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const [selectedTeam, setSelectedTeam] = useState<Team>();
    const [newChannelName, setNewChannelName] = useState<string>('');

    const submitButtonEnabled = selectedTeam && newChannelName.trim();

    const {formatMessage} = useIntl();
    const confirmButtonText = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text',
        defaultMessage: 'Convert to Private Channel',
    });

    useEffect(() => {
        if (commonTeams.length > 0) {
            setSelectedTeam(commonTeams[0]);
        }
    }, [commonTeams]);

    const handleOnPress = useCallback(async () => {
        if (!submitButtonEnabled) {
            return;
        }

        const {updatedChannel, error} = await convertGroupMessageToPrivateChannel(serverUrl, channelId, selectedTeam.id, newChannelName);

        if (error) {
            logError(error);
            return;
        }

        if (!updatedChannel) {
            return;
        }

        await switchToChannelById(serverUrl, updatedChannel.id, selectedTeam.id);
    }, [selectedTeam, newChannelName, submitButtonEnabled]);

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
                    onSelectTeam={setSelectedTeam}
                    selectedTeamId={selectedTeam?.id}
                />
            }
            <ChannelNameInput onChange={setNewChannelName}/>
            <Button
                onPress={handleOnPress}
                text={confirmButtonText}
                theme={theme}
                buttonType={submitButtonEnabled ? 'destructive' : 'disabled'}
                size='lg'
            />
        </View>
    );
};
