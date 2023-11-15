// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {convertGroupMessageToPrivateChannel, switchToChannelById} from '@actions/remote/channel';
import Loading from '@app/components/loading';
import {logError} from '@app/utils/log';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {isErrorWithMessage} from '@utils/errors';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
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
            marginRight: 10,
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
    const intl = useIntl();

    const [selectedTeam, setSelectedTeam] = useState<Team>();
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [conversionInProgress, setConversionInProgress] = useState(false); // LOL revert this default value back to false

    const {formatMessage} = useIntl();
    const userDisplayNames = useMemo(() => profiles.map((profile) => displayUsername(profile, locale, teammateNameDisplay)), [profiles]);
    const submitButtonEnabled = !conversionInProgress && selectedTeam && newChannelName.trim();

    useEffect(() => {
        if (commonTeams.length > 0) {
            setSelectedTeam(commonTeams[0]);
        }
    }, []);

    const handleOnPress = useCallback(preventDoubleTap(async () => {
        if (!submitButtonEnabled) {
            return;
        }

        setConversionInProgress(true);

        const {updatedChannel, error} = await convertGroupMessageToPrivateChannel(serverUrl, channelId, selectedTeam.id, newChannelName);
        if (error) {
            if (isErrorWithMessage(error)) {
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
    }), [selectedTeam, newChannelName, submitButtonEnabled]);

    if (commonTeams.length === 0) {
        return (
            <NoCommonTeamForm containerStyles={styles.container}/>
        );
    }

    const messageBoxHeader = intl.formatMessage({
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
    const defaultUserDisplayNames = intl.formatMessage({id: 'channel_info.convert_gm_to_channel.warning.body.yourself', defaultMessage: 'yourself'});
    const memberNames = profiles.length > 0 ? intl.formatList(userDisplayNames) : defaultUserDisplayNames;
    const messageBoxBody = intl.formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.bodyXXXX',
        defaultMessage: 'You are about to convert the Group Message with {memberNames} to a Channel. This cannot be undone.',
    }, {
        memberNames,
    });

    const buttonIcon = conversionInProgress ? (
        <Loading
            containerStyle={styles.loadingContainerStyle}
            color={changeOpacity(theme.centerChannelColor, 0.32)}
        />
    ) : null;

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
                iconComponent={buttonIcon}
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