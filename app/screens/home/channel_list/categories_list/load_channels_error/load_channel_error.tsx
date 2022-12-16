// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {retryInitialChannel} from '@actions/remote/retry';
import LoadingError from '@components/loading_error';
import {useServerUrl} from '@context/server';
import {setTeamLoading} from '@store/team_load_store';

import LoadTeamsError from '../load_teams_error';

type Props = {
    teamDisplayName: string;
    teamId: string;
}

const LoadChannelsError = ({teamDisplayName, teamId}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const [loading, setLoading] = useState(false);

    const onRetryTeams = useCallback(async () => {
        setLoading(true);

        setTeamLoading(serverUrl, true);
        const {error} = await retryInitialChannel(serverUrl, teamId);
        setTeamLoading(serverUrl, false);

        if (error) {
            setLoading(false);
        }
    }, [teamId]);

    if (!teamId) {
        <LoadTeamsError/>;
    }
    return (
        <LoadingError
            loading={loading}
            message={formatMessage({id: 'load_channels_error.message', defaultMessage: 'There was a problem loading content for this team.'})}
            onRetry={onRetryTeams}
            title={formatMessage({id: 'load_channels_error.title', defaultMessage: "Couldn't load {teamDisplayName}"}, {teamDisplayName})}
        />
    );
};

export default LoadChannelsError;
