// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, map} from 'rxjs';

import {type PlaybookRun, PlaybookRunStatus} from '../client/rest';

type PlaybookRunsState = {
    [teamId: string]: PlaybookRun[];
};

const playbookRunsSubjects: Dictionary<BehaviorSubject<PlaybookRunsState>> = {};

const getPlaybookRunsSubject = (serverUrl: string) => {
    if (!playbookRunsSubjects[serverUrl]) {
        playbookRunsSubjects[serverUrl] = new BehaviorSubject({});
    }

    return playbookRunsSubjects[serverUrl];
};

export const getPlaybookRuns = (serverUrl: string, teamId: string) => {
    return getPlaybookRunsSubject(serverUrl).value[teamId] || [];
};

export const setPlaybookRuns = (serverUrl: string, teamId: string, runs: PlaybookRun[]) => {
    const subject = getPlaybookRunsSubject(serverUrl);
    const current = subject.value;
    subject.next({
        ...current,
        [teamId]: runs,
    });
};

export const observePlaybookRuns = (serverUrl: string) => {
    return getPlaybookRunsSubject(serverUrl).asObservable();
};

export const usePlaybookRuns = (serverUrl: string, teamId: string) => {
    const [runs, setRuns] = useState<PlaybookRun[]>([]);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const subscription = runsSubject.subscribe((state) => {
            setRuns(state[teamId] || []);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [teamId]);

    return runs;
};

export const usePlaybookRunsForChannel = (serverUrl: string, teamId: string, channelId: string) => {
    const [runs, setRuns] = useState<PlaybookRun[]>([]);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const filterRuns = (state: PlaybookRunsState) => {
            const teamRuns = state[teamId] || [];
            return teamRuns.filter((run) =>
                run.channel_id === channelId &&
                run.current_status === PlaybookRunStatus.InProgress,
            );
        };

        const subscription = runsSubject.pipe(
            map(filterRuns),
        ).subscribe(setRuns);

        return () => {
            subscription?.unsubscribe();
        };
    }, [serverUrl, teamId, channelId]);

    return runs;
};

export const useActivePlaybookRunsCount = (serverUrl: string, teamId: string, channelId: string) => {
    const [count, setCount] = useState(0);

    const runsSubject = getPlaybookRunsSubject(serverUrl);

    useEffect(() => {
        const getActiveRunsCount = (state: PlaybookRunsState) => {
            const teamRuns = state[teamId] || [];
            return teamRuns.filter((run) =>
                run.channel_id === channelId &&
                run.current_status === PlaybookRunStatus.InProgress,
            ).length;
        };

        const subscription = runsSubject.pipe(
            map(getActiveRunsCount),
        ).subscribe(setCount);

        return () => {
            subscription?.unsubscribe();
        };
    }, [serverUrl, teamId, channelId]);

    return count;
};
