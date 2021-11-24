// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useMemo} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {map} from 'rxjs/operators';

import PostDraft from '@components/post_draft';
import PostList from '@components/post_list';
import ServerVersion from '@components/server_version';
import {Database} from '@constants';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelNavBar from './channel_nav_bar';
import FailedChannels from './failed_channels';
import FailedTeams from './failed_teams';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type {LaunchProps} from '@typings/launch';

type ChannelProps = LaunchProps & {
    currentChannelId: string;
    currentTeamId: string;
    time?: number;
};

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {SYSTEM}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    sectionContainer: {
        marginTop: 10,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'OpenSans-Semibold',
        color: theme.centerChannelColor,
    },
}));

const Channel = ({currentChannelId, currentTeamId}: ChannelProps) => {
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
    const appState = useAppState();

    const renderComponent = useMemo(() => {
        if (!currentTeamId) {
            return <FailedTeams/>;
        }

        if (!currentChannelId) {
            return <FailedChannels teamId={currentTeamId}/>;
        }

        return (
            <>
                <ChannelNavBar
                    channelId={currentChannelId}
                    onPress={() => null}
                />
                <PostList
                    channelId={currentChannelId}
                    testID='channel.post_list'
                    forceQueryAfterAppState={appState}
                />
                <PostDraft
                    channelId={currentChannelId}
                    screenId={''}
                />
            </>
        );
    }, [currentTeamId, currentChannelId, theme, appState]);

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'bottom']}
        >
            <ServerVersion/>
            {renderComponent}
        </SafeAreaView>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelId: database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).pipe(
        map(({value}: {value: string}) => value),
    ),
    currentTeamId: database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}: {value: string}) => value),
    ),
}));

export default withDatabase(enhanced(Channel));
