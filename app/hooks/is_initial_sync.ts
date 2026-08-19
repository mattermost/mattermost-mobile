// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';

import {getHasEverStartedSyncSubject} from '@store/team_load_store';

import useDidMount from './did_mount';
import {useTeamsLoading} from './teams_loading';

const useHasEverStartedSync = (serverUrl: string) => {
    const [hasEverStarted, setHasEverStarted] = useState(() => getHasEverStartedSyncSubject(serverUrl).getValue());
    useDidMount(() => {
        const sub = getHasEverStartedSyncSubject(serverUrl).subscribe(setHasEverStarted);

        return () => sub.unsubscribe();
    });

    return hasEverStarted;
};

export const useIsInitialSync = (serverUrl: string) => {
    const isTeamLoading = useTeamsLoading(serverUrl);
    const hasEverStartedSync = useHasEverStartedSync(serverUrl);
    return isTeamLoading || !hasEverStartedSync;
};
