// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, StyleSheet, View} from 'react-native';

import {createDirectChannel, switchToChannelById} from '@actions/remote/channel';
import Button from '@components/button';
import OptionBox, {OPTIONS_HEIGHT} from '@components/option_box';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

export type OptionsType = 'all' | 'message';

type Props = {
    location?: AvailableScreens;
    type: OptionsType;
    userId: string;
    username: string;
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

const UserProfileOptions = ({location, type, userId, username}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const mentionUser = useCallback(async () => {
        await dismissBottomSheet(Screens.USER_PROFILE);
        DeviceEventEmitter.emit(Events.SEND_TO_POST_DRAFT, {location, text: `@${username}`});
    }, [location, username]);

    const openChannel = useCallback(async () => {
        await dismissBottomSheet(Screens.USER_PROFILE);
        const {data} = await createDirectChannel(serverUrl, userId);
        if (data) {
            switchToChannelById(serverUrl, data.id);
        }
    }, [userId, serverUrl]);

    if (type === 'all') {
        return (
            <View style={styles.container}>
                <OptionBox
                    iconName='send'
                    onPress={openChannel}
                    testID='user_profile_options.send_message.option'
                    text={intl.formatMessage({id: 'channel_info.send_a_mesasge', defaultMessage: 'Send message'})}
                />
                <View style={styles.divider}/>
                <OptionBox
                    iconName='at'
                    onPress={mentionUser}
                    testID='user_profile_options.mention.option'
                    text={intl.formatMessage({id: 'channel_info.mention', defaultMessage: 'Mention'})}
                />
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
