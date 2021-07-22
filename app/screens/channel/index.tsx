// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {SafeAreaView} from 'react-native-safe-area-context';

import {logout} from '@actions/remote/general';
import StatusBar from '@components/status_bar';
import ViewTypes from '@constants/view';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {isMinimumServerVersion} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {unsupportedServer} from '@utils/supported_server/supported_server';
import {isSystemAdmin as isUserSystemAdmin} from '@utils/user';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import ChannelNavBar from './channel_nav_bar';

import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';
import type {LaunchType} from '@typings/launch';
import {useTheme} from '@context/theme';
import {Text, View} from 'react-native';

const {SERVER: {CHANNEL, SYSTEM, USER}} = MM_TABLES;

type WithDatabaseArgs = { database: Database }
type WithChannelAndThemeArgs = WithDatabaseArgs & {
    currentChannelId: SystemModel;
    currentUserId: SystemModel;
}
type ChannelProps = WithDatabaseArgs & {
    channel: ChannelModel;
    config: SystemModel;
    launchType: LaunchType;
    user: UserModel;
    currentUserId: SystemModel;
};

const Channel = ({channel, user, config, currentUserId}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
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

    //todo: https://mattermost.atlassian.net/browse/MM-37266

    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const serverVersion = (config.value?.Version) || '';

        const isSystemAdmin = isUserSystemAdmin(user.roles);

        if (serverVersion) {
            const {RequiredServer: {MAJOR_VERSION, MIN_VERSION, PATCH_VERSION}} = ViewTypes;
            const isSupportedServer = isMinimumServerVersion(serverVersion, MAJOR_VERSION, MIN_VERSION, PATCH_VERSION);

            if (!isSupportedServer) {
                // Only display the Alert if the TOS does not need to show first
                unsupportedServer(isSystemAdmin, intl.formatMessage);
            }
        }
    }, [config.value?.Version, intl.formatMessage, user.roles]);

    const serverUrl = useServerUrl();

    const doLogout = () => {
        logout(serverUrl!);
    };

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'bottom']}
        >
            <StatusBar theme={theme}/>
            <ChannelNavBar
                currentUserId={currentUserId.value}
                channel={channel}
                onPress={() => null}
                config={config.value}
            />
            <View style={styles.sectionContainer}>
                <Text
                    onPress={doLogout}
                    style={styles.sectionTitle}
                >
                    {`Logout from ${serverUrl}`}
                </Text>
            </View>

        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    flex: {
        flex: 1,
    },
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.black,
    },
}));

export const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID),
    currentUserId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID),
    config: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
}));

const withChannelAndUser = withObservables(['currentChannelId'], ({currentChannelId, currentUserId, database}: WithChannelAndThemeArgs) => ({
    channel: database.collections.get(CHANNEL).findAndObserve(currentChannelId.value),
    user: database.collections.get(USER).findAndObserve(currentUserId.value),
}));

export default withDatabase(withSystemIds(withChannelAndUser(Channel)));
