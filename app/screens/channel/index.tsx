// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useDatabase} from '@nozbe/watermelondb/hooks';
import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';

import {Preferences} from '@constants';
import {getThemeForUser} from '@queries/servers/preference';
import {getCurrentUserId} from '@queries/servers/system';

import ChannelNavBar from './channel_nav_bar';

import type {LaunchProps} from '@typings/launch';

type ChannelProps = LaunchProps

const Channel = ({launchType}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
    console.log(launchType); // eslint-disable-line no-console
    // TODO: If LaunchProps.error is true, use the LaunchProps.launchType to determine which
    // error message to display. For example:
    // if (props.launchError) {
    //     let erroMessage;
    //     if (props.launchType === LaunchType.DeepLink) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.deepLink', defaultMessage: 'Did not find a server for this deep link'});
    //     } else if (props.launchType === LaunchType.Notification) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.notification', defaultMessage: 'Did not find a server for this notification'});
    //     }
    // }

    //todo: Read Messages  - Do we need KeyboardLayout component ?
    //todo: Read Messages  - Implement goToChannelInfo
    //todo: read theme from Preference entity

    const serverDatabase = useDatabase();
    const [theme, setTheme] = useState<Theme>(Preferences.THEMES.default);

    useEffect(() => {
        // retrieves theme for user
        const getUserTheme = async () => {
            const userId = (await getCurrentUserId(serverDatabase)) as string;
            if (userId) {
                const currentTheme = await getThemeForUser(serverDatabase, userId);
                if (currentTheme) {
                    setTheme(currentTheme);
                }
            }
        };

        getUserTheme();
    }, [serverDatabase]);

    return (
        <>
            <SafeAreaView style={styles.flex}>
                <ChannelNavBar
                    onPress={() => null}
                    theme={theme}
                />
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

export default Channel;
