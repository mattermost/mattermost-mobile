// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, StyleSheet, View} from 'react-native';

import {createDirectChannel, switchToChannelById} from '@actions/remote/channel';
import {joinCallAndOpenCallScreen} from '@calls/actions/calls';
import {showUserCallOptions} from '@calls/components/user_call_options';
import {isPhoneDialingAvailable} from '@calls/state';
import Button from '@components/button';
import OptionBox, {OPTIONS_HEIGHT} from '@components/option_box';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {DialablePhone} from '@calls/types/calls';
import type {AvailableScreens} from '@typings/screens/navigation';

export type OptionsType = 'all' | 'message';

type Props = {
    location?: AvailableScreens;
    type: OptionsType;
    userId: string;
    username: string;
    phones: DialablePhone[];
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: OPTIONS_HEIGHT,
        marginBottom: 20,
        width: '100%',
    },
    divider: {
        marginRight: 8,
    },
    icon: {
        fontSize: 24,
        lineHeight: 22,
    },
    singleButton: {
        flexDirection: 'row',
        width: '100%',
    },
    singleContainer: {
        marginBottom: 20,
    },
});

const UserProfileOptions = ({location, type, userId, username, phones}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const mentionUser = useCallback(async () => {
        await dismissBottomSheet();
        DeviceEventEmitter.emit(Events.SEND_TO_POST_DRAFT, {location, text: `@${username}`});
    }, [location, username]);

    const openChannel = useCallback(async () => {
        await dismissBottomSheet();
        const {data} = await createDirectChannel(serverUrl, userId);
        if (data) {
            switchToChannelById(serverUrl, data.id);
        }
    }, [userId, serverUrl]);

    const startCall = useCallback(async () => {
        const {data, error} = await createDirectChannel(serverUrl, userId);
        if (data) {
            joinCallAndOpenCallScreen(intl, serverUrl, data.id);
        } else {
            logError('error on UserProfileOptions.startCall', getFullErrorMessage(error));
        }
    }, [intl, serverUrl, userId]);

    const openCallOptions = useCallback(async () => {
        await dismissBottomSheet();
        showUserCallOptions(intl, serverUrl, userId, phones, startCall);
    }, [intl, serverUrl, userId, phones, startCall]);

    if (type === 'all') {
        return (
            <View style={styles.container}>
                <OptionBox
                    iconName='send'
                    onPress={openChannel}
                    testID='user_profile_options.send_message.option'
                    text={intl.formatMessage({id: 'channel_info.send_a_mesasge', defaultMessage: 'Send a message'})}
                />
                <View style={styles.divider}/>
                <OptionBox
                    iconName='at'
                    onPress={mentionUser}
                    testID='user_profile_options.mention.option'
                    text={intl.formatMessage({id: 'channel_info.mention', defaultMessage: 'Mention'})}
                />
                {phones.length > 0 && isPhoneDialingAvailable(serverUrl) && (
                    <>
                        <View style={styles.divider}/>
                        <OptionBox
                            iconName='phone'
                            onPress={openCallOptions}
                            testID='user_profile_options.call.option'
                            text={intl.formatMessage({id: 'mobile.user_profile.call', defaultMessage: 'Call'})}
                        />
                    </>
                )}
            </View>
        );
    }

    return (
        <View style={styles.singleContainer}>
            <Button
                onPress={openChannel}
                testID='user_profile_options.send_message.option'
                size='lg'
                emphasis='tertiary'
                theme={theme}
                text={intl.formatMessage({id: 'channel_info.send_mesasge', defaultMessage: 'Send message'})}
                iconName='send'
            />
        </View>
    );
};

export default UserProfileOptions;
