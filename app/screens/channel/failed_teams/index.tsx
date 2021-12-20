// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {retryInitialTeamAndChannel} from '@actions/remote/retry';
import FailedAction from '@components/failed_action';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

const FailedTeams = () => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const title = intl.formatMessage({id: 'failed_action.something_wrong', defaultMessage: 'Something went wrong'});
    const message = intl.formatMessage({id: 'failed_action.fetch_teams', defaultMessage: 'An error ocurred while loading the teams of this server'});

    const onAction = useCallback(async () => {
        setLoading(true);
        const {error} = await retryInitialTeamAndChannel(serverUrl);

        if (error) {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <Loading
                containerStyle={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
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

export default FailedTeams;
