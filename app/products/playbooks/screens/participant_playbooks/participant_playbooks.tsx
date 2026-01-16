// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {fetchPlaybookRunsPageForParticipant} from '@playbooks/actions/remote/runs';
import RunList from '@playbooks/components/run_list';
import {isRunFinished} from '@playbooks/utils/run';
import {popTopScreen} from '@screens/navigation';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    currentUserId: string;
    componentId: AvailableScreens;
    cachedPlaybookRuns: PlaybookRunModel[];
    currentTeamId: string;
};

const ParticipantPlaybooks = ({
    currentUserId,
    componentId,
    cachedPlaybookRuns,
    currentTeamId,
}: Props) => {
    const serverUrl = useServerUrl();

    const [participantRuns, setParticipantRuns] = useState<Array<PlaybookRun | PlaybookRunModel>>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [showCachedWarning, setShowCachedWarning] = useState(false);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const fetchData = useCallback(async (page = 0, append = false) => {
        if (!currentUserId) {
            return;
        }

        if (append) {
            setLoadingMore(true);
        } else {
            setShowCachedWarning(false);
            setLoading(true);
        }

        const {runs = [], hasMore: hasMoreFromResult = false, error} = await fetchPlaybookRunsPageForParticipant(serverUrl, currentUserId, currentTeamId, page);

        if (error) {
            // Fallback to database cache only for the first page
            if (page === 0 && cachedPlaybookRuns.length > 0) {
                setParticipantRuns(cachedPlaybookRuns);
                setHasMore(false);
                setShowCachedWarning(true);
            }
        } else {
            const newRuns = runs;
            if (append) {
                setParticipantRuns((prev) => [...prev, ...newRuns]);
            } else {
                setParticipantRuns(newRuns);
            }
            setHasMore(hasMoreFromResult);
            setCurrentPage(page);
        }

        if (append) {
            setLoadingMore(false);
        } else {
            setLoading(false);
        }
    }, [currentUserId, currentTeamId, serverUrl, cachedPlaybookRuns]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchData(currentPage + 1, true);
        }
    }, [loadingMore, hasMore, currentPage, fetchData]);

    useEffect(() => {
        fetchData();

        // Only fetch the data on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showMoreButton = useCallback(() => {
        return hasMore;
    }, [hasMore]);

    const [inProgressRuns, finishedRuns] = useMemo(() => {
        const inProgress: Array<PlaybookRun | PlaybookRunModel> = [];
        const finished: Array<PlaybookRun | PlaybookRunModel> = [];

        participantRuns.forEach((run) => {
            if (isRunFinished(run)) {
                finished.push(run);
            } else {
                inProgress.push(run);
            }
        });

        return [inProgress, finished] as const;
    }, [participantRuns]);

    return (
        <RunList
            componentId={componentId}
            inProgressRuns={inProgressRuns}
            finishedRuns={finishedRuns}
            fetchMoreRuns={loadMore}
            showMoreButton={showMoreButton}
            fetching={loadingMore}
            loading={loading}
            showCachedWarning={showCachedWarning}
        />
    );
};

export default ParticipantPlaybooks;
