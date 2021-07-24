// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {logout} from '@actions/remote/session';
import ServerVersion from '@components/server_version';
import StatusBar from '@components/status_bar';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelNavBar from './channel_nav_bar';

import type SystemModel from '@typings/database/models/servers/system';
import type {LaunchProps} from '@typings/launch';
import type {WithDatabaseArgs} from '@typings/database/database';

import FailedChannels from './failed_channels';
import FailedTeams from './failed_teams';

type ChannelProps = WithDatabaseArgs & LaunchProps & {
    currentChannelId: SystemModel;
    currentTeamId: SystemModel;
    time?: number;
};

const {SERVER: {SYSTEM}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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
        color: theme.centerChannelColor,
    },
}));

const Channel = ({currentChannelId, currentTeamId, time}: ChannelProps) => {
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

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const doLogout = () => {
        logout(serverUrl!);
    };

    const renderComponent = useMemo(() => {
        if (!currentTeamId.value) {
            return <FailedTeams/>;
        }

        if (!currentChannelId.value) {
            return <FailedChannels teamId={currentTeamId.value}/>;
        }

        return (
            <ChannelNavBar
                channelId={currentChannelId.value}
                onPress={() => null}
            />
        );
    }, [currentTeamId.value, currentChannelId.value]);

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'bottom']}
        >
            <ServerVersion/>
            <StatusBar theme={theme}/>
            {renderComponent}
            <View style={styles.sectionContainer}>
                <Text
                    onPress={doLogout}
                    style={styles.sectionTitle}
                >
                    {`Loaded in: ${time || 0}ms. Logout from ${serverUrl}`}
                </Text>
            </View>

        </SafeAreaView>
    );
};

const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID),
    currentTeamId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID),
}));

export default withDatabase(withSystemIds(Channel));
