// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';

import {getGroupMessageMembersCommonTeams} from '@actions/remote/channel';
import {useServerUrl} from '@app/context/server';

import {ConvertGMToChannelForm} from './convert_gm_to_channel_form';
import {Loader} from './loader';

type Props = {
    channelId: string;
}

const loadingIndicatorTimeout = 1200;

const ConvertGMToChannel = (props: Props) => {
    const [loadingAnimationTimeout, setLoadingAnimationTimeout] = useState(false);
    const [commonTeamsFetched, setCommonTeamsFetched] = useState(false);

    const [commonTeams, setCommonTeams] = useState<Team[]>([]);

    const serverUrl = useServerUrl();

    useEffect(() => {
        setTimeout(() => setLoadingAnimationTimeout(true), loadingIndicatorTimeout);

        async function work() {
            const {teams} = await getGroupMessageMembersCommonTeams(serverUrl, props.channelId);
            if (!teams) {
                return;
            }

            setCommonTeams(teams);
            setCommonTeamsFetched(true);
        }

        work();
    }, []);

    const showLoader = !loadingAnimationTimeout && !commonTeamsFetched;
    if (showLoader) {
        return (<Loader/>);
    }

    return (
        <ConvertGMToChannelForm
            commonTeams={commonTeams}
        />
    );
};

export default ConvertGMToChannel;
