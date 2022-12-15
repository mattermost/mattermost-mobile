// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {retryInitialTeamAndChannel} from '@actions/remote/retry';
import LoadingError from '@components/loading_error';
import {Events} from '@constants';
import {useServerDisplayName, useServerUrl} from '@context/server';

const LoadCategoriesError = () => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const serverName = useServerDisplayName();
    const [loading, setLoading] = useState(false);

    const onRetryTeams = useCallback(async () => {
        setLoading(true);

        DeviceEventEmitter.emit(Events.FETCHING_TEAM_CHANNELS, {serverUrl, value: true});
        const {error} = await retryInitialTeamAndChannel(serverUrl);
        DeviceEventEmitter.emit(Events.FETCHING_TEAM_CHANNELS, {serverUrl, value: false});

        if (error) {
            setLoading(false);
        }
    }, []);

    return (
        <LoadingError
            loading={loading}
            message={formatMessage({id: 'load_categories_error.message', defaultMessage: 'There was a problem loading content for this server.'})}
            onRetry={onRetryTeams}
            title={formatMessage({id: 'load_categories_error.title', defaultMessage: "Couldn't load categories for {serverName}"}, {serverName})}
        />
    );
};

export default LoadCategoriesError;
