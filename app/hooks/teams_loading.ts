// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {getLoadingTeamChannelsSubject} from '@store/team_load_store';

export const useTeamsLoading = (serverUrl: string) => {
    // const subject = getLoadingTeamChannelsSubject(serverUrl);
    // const [loading, setLoading] = useState(subject.getValue() !== 0);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const sub = getLoadingTeamChannelsSubject(serverUrl).pipe(
            switchMap((v) => of$(v !== 0)),
            distinctUntilChanged(),
        ).subscribe(setLoading);

        return () => sub.unsubscribe();
    }, []);

    return loading;
};
