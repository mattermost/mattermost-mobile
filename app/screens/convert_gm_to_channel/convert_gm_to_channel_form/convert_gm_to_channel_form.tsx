// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {convertGroupMessageToPrivateChannel, switchToChannelById} from '@actions/remote/channel';
import Button from '@components/button';
import {ServerErrors} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {isErrorWithMessage, isServerError} from '@utils/errors';
import {logError} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

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
        errorMessage: {
            color: theme.dndIndicator,
        },
        loadingContainerStyle: {
            padding: 0,
            top: -2,
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
    const {formatList, formatMessage} = useIntl();

    const [selectedTeam, setSelectedTeam] = useState<Team>(commonTeams[0]);
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [channelNameErrorMessage, setChannelNameErrorMessage] = useState<string>('');
    const [conversionInProgress, setConversionInProgress] = useState(false);

    const userDisplayNames = useMemo(() => profiles.map((profile) => displayUsername(profile, locale, teammateNameDisplay)), [profiles, teammateNameDisplay, locale]);
    const submitButtonEnabled = !conversionInProgress && selectedTeam && newChannelName.trim();

    const handleOnPress = usePreventDoubleTap(useCallback(async () => {
        if (!submitButtonEnabled) {
            return;
        }

        setConversionInProgress(true);

        const {updatedChannel, error} = await convertGroupMessageToPrivateChannel(serverUrl, channelId, selectedTeam.id, newChannelName);
        if (error) {
            if (isServerError(error) && error.server_error_id === ServerErrors.DUPLICATE_CHANNEL_NAME && isErrorWithMessage(error)) {
                setChannelNameErrorMessage(error.message);
            } else if (isErrorWithMessage(error)) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage(formatMessage({id: 'channel_info.convert_gm_to_channel.conversion_error', defaultMessage: 'Something went wrong. Failed to convert Group Message to Private Channel.'}));
            }

            setConversionInProgress(false);
            return;
        }

        if (!updatedChannel) {
            logError('No updated channel received from server when converting GM to private channel');
            setErrorMessage(formatMessage({id: 'channel_info.convert_gm_to_channel.conversion_error', defaultMessage: 'Something went wrong. Failed to convert Group Message to Private Channel.'}));
            setConversionInProgress(false);
            return;
        }

        setErrorMessage('');
        switchToChannelById(serverUrl, updatedChannel.id, selectedTeam.id);
        setConversionInProgress(false);
    }, [submitButtonEnabled, serverUrl, channelId, selectedTeam.id, newChannelName, formatMessage]));

    if (commonTeams.length === 0) {
        return (
            <NoCommonTeamForm containerStyles={styles.container}/>
        );
    }

    const messageBoxHeader = formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.header',
        defaultMessage: 'Conversation history will be visible to any channel members',
    });

    const textConvert = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text',
        defaultMessage: 'Convert to Private Channel',
    });

    const textConverting = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text_converting',
        defaultMessage: 'Converting...',
    });

    const confirmButtonText = conversionInProgress ? textConverting : textConvert;
    const defaultUserDisplayNames = formatMessage({id: 'channel_info.convert_gm_to_channel.warning.body.yourself', defaultMessage: 'yourself'});
    const memberNames = profiles.length > 0 ? formatList(userDisplayNames) : defaultUserDisplayNames;
    const messageBoxBody = formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.bodyXXXX',
        defaultMessage: 'You are about to convert the Group Message with {memberNames} to a Channel. This cannot be undone.',
    }, {
        memberNames,
    });

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
            <ChannelNameInput
                onChange={setNewChannelName}
                error={channelNameErrorMessage}
            />
            <Button
                onPress={handleOnPress}
                text={confirmButtonText}
                theme={theme}
                size='lg'
                disabled={!submitButtonEnabled}
                isDestructive={true}
                showLoader={conversionInProgress}
            />
            {
                errorMessage &&
                <Text style={styles.errorMessage}>
                    {errorMessage}
                </Text>
            }
        </View>
    );
};
