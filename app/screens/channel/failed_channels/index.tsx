// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import {retryInitialChannel} from '@actions/remote/retry';
import FailedAction from '@components/failed_action';
import Loading from '@components/loading';
import {MM_TABLES} from '@constants/database';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type TeamModel from '@typings/database/models/servers/team';

type FailedChannelsProps = {
    team: TeamModel;
}

const style = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const FailedChannels = ({team}: FailedChannelsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const title = intl.formatMessage({id: 'failed_action.something_wrong', defaultMessage: 'Something went wrong'});
    const message = intl.formatMessage({id: 'failed_action.fetch_channels', defaultMessage: 'Channels could not be loaded for {teamName}.'}, {teamName: team.displayName});

    const onAction = useCallback(async () => {
        setLoading(true);
        const {error} = await retryInitialChannel(serverUrl, team.id);

        if (error) {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <Loading
                containerStyle={style.loadingContainer}
                color={theme.buttonBg}
            />
        );
    }

    return (
        <FailedAction
            message={message}
            title={title}
            onAction={onAction}
        />
    );
};

const withTeam = withObservables(['teamId'], ({teamId, database}: {teamId: string} & WithDatabaseArgs) => ({
    team: database.get(MM_TABLES.SERVER.TEAM).findAndObserve(teamId),
}));

export default withDatabase(withTeam(FailedChannels));
