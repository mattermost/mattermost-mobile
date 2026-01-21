// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';

import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchFinishedRunsForChannel} from '@playbooks/actions/remote/runs';
import RunList, {type RunListTabsNames} from '@playbooks/components/run_list';
import {isRunFinished} from '@playbooks/utils/run';
import {navigateBack} from '@screens/navigation';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

type Props = {
    channelId: string;
    allRuns: PlaybookRunModel[];
};

const PlaybookRuns = ({
    channelId,
    allRuns,
}: Props) => {
    const serverUrl = useServerUrl();

    const [fetching, setFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const page = useRef(0);

    const [remoteFinishedRuns, setRemoteFinishedRuns] = useState<PlaybookRun[]>([]);

    useAndroidHardwareBackHandler(Screens.PLAYBOOKS_RUNS, navigateBack);

    const [inProgressRuns, localFinishedRuns] = useMemo(() => {
        const inProgress: PlaybookRunModel[] = [];
        const finished: PlaybookRunModel[] = [];

        allRuns.forEach((run) => {
            if (isRunFinished(run)) {
                finished.push(run);
            } else {
                inProgress.push(run);
            }
        });

        return [inProgress, finished] as const;
    }, [allRuns]);

    const showMoreButton = useCallback((tab: RunListTabsNames) => {
        return tab === 'finished' && hasMore;
    }, [hasMore]);

    const fetchMoreFinishedRuns = useCallback(async (tab: RunListTabsNames) => {
        if (fetching || tab !== 'finished') {
            return;
        }
        setFetching(true);
        const {runs, has_more = false, error} = await fetchFinishedRunsForChannel(serverUrl, channelId, page.current);
        setFetching(false);
        if (error) {
            setHasMore(false);
            return;
        }
        setHasMore(has_more);
        page.current++;
        if (runs?.length) {
            setRemoteFinishedRuns((prev) => [...prev, ...runs]);
        }
    }, [channelId, fetching, serverUrl]);

    return (
        <RunList
            location={Screens.PLAYBOOKS_RUNS}
            inProgressRuns={inProgressRuns}
            finishedRuns={remoteFinishedRuns.length ? remoteFinishedRuns : localFinishedRuns}
            fetchMoreRuns={fetchMoreFinishedRuns}
            showMoreButton={showMoreButton}
            fetching={fetching}
            channelId={channelId}
        />
    );
};

export default PlaybookRuns;
