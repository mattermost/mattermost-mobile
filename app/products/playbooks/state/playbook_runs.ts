// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, map} from 'rxjs';

import {type PlaybookRun, PlaybookRunStatus} from '../client/rest';

type PlaybookRunsState = PlaybookRun[];

const playbookRunsSubjects: Dictionary<BehaviorSubject<PlaybookRunsState>> = {};

const getPlaybookRunsSubject = (serverUrl: string) => {
    if (!playbookRunsSubjects[serverUrl]) {
        playbookRunsSubjects[serverUrl] = new BehaviorSubject([]);
    }

    return playbookRunsSubjects[serverUrl];
};

const byTeamId = (teamId: string) => (run: PlaybookRun) => run.team_id === teamId;
const notByTeamId = (teamId: string) => (run: PlaybookRun) => run.team_id !== teamId;
const byChannelId = (channelId: string) => (run: PlaybookRun) => run.channel_id === channelId;

export const getPlaybookRunsForTeam = (serverUrl: string, teamId: string) => {
    return getPlaybookRunsSubject(serverUrl).value.filter(byTeamId(teamId));
};

export const setPlaybookRunsForTeam = (serverUrl: string, teamId: string, runs: PlaybookRun[]) => {
    const subject = getPlaybookRunsSubject(serverUrl);
    const current = subject.value;
    subject.next([
        ...current.filter(notByTeamId(teamId)),
        ...runs,
    ]);
};

export const observePlaybookRuns = (serverUrl: string) => {
    return getPlaybookRunsSubject(serverUrl).asObservable();
};

export const usePlaybookRuns = (serverUrl: string, teamId: string) => {
    const [runs, setRuns] = useState<PlaybookRun[]>([]);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const subscription = runsSubject.subscribe((state) => {
            setRuns(state.filter(byTeamId(teamId)));
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [runsSubject, teamId]);

    return runs;
};

export const usePlaybookRunsForChannel = (serverUrl: string, channelId: string) => {
    const [runs, setRuns] = useState<PlaybookRun[]>([]);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const filterRuns = (state: PlaybookRunsState) => {
            return state.filter(byChannelId(channelId)).filter((run) =>
                run.current_status === PlaybookRunStatus.InProgress,
            );
        };

        const subscription = runsSubject.pipe(
            map(filterRuns),
        ).subscribe(setRuns);

        return () => {
            subscription?.unsubscribe();
        };
    }, [runsSubject, serverUrl, channelId]);

    return runs;
};

export const useActivePlaybookRunsCount = (serverUrl: string, channelId: string) => {
    const [count, setCount] = useState(0);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const getActiveRunsCount = (state: PlaybookRunsState) => {
            return state.filter(byChannelId(channelId)).filter((run) =>
                run.current_status === PlaybookRunStatus.InProgress,
            ).length;
        };

        const subscription = runsSubject.pipe(
            map(getActiveRunsCount),
        ).subscribe(setCount);

        return () => {
            subscription?.unsubscribe();
        };
    }, [runsSubject, serverUrl, channelId]);

    return count;
};
