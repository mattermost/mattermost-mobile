// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {map} from 'rxjs/operators';

import {fetchPostsForChannel} from '@actions/remote/post';
import PostList from '@components/post_list';
import {Database} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelNavBar from './channel_nav_bar';
import FailedChannels from './failed_channels';
import FailedTeams from './failed_teams';
import Intro from './intro';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type {LaunchProps} from '@typings/launch';

type ChannelProps = LaunchProps & {
    currentChannelId: string;
    currentTeamId: string;
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
    const appState = useAppState();
    const [loading, setLoading] = useState(false);
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        setLoading(true);
        fetchPostsForChannel(serverUrl, currentChannelId).then(() => {
            setLoading(false);
        });
    }, [currentChannelId]);

    if (!currentTeamId) {
        return <FailedTeams/>;
    }

    if (!currentChannelId) {
        return <FailedChannels teamId={currentTeamId}/>;
    }

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right']}
        >
            <ChannelNavBar
                channelId={currentChannelId}
                onPress={() => null}
            />
            <PostList
                channelId={currentChannelId}
                footer={(
                    <Intro
                        channelId={currentChannelId}
                        loading={loading}
                    />
                )}
                forceQueryAfterAppState={appState}
                testID='channel.post_list'
            />
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
