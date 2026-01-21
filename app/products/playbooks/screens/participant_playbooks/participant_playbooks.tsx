// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, View} from 'react-native';

import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useDefaultHeaderHeight} from '@hooks/header';
import {fetchPlaybookRunsPageForParticipant} from '@playbooks/actions/remote/runs';
import RunList from '@playbooks/components/run_list';
import {isRunFinished} from '@playbooks/utils/run';
import {navigateBack} from '@screens/navigation';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

type Props = {
    currentUserId: string;
    cachedPlaybookRuns: PlaybookRunModel[];
    isTabletView?: boolean;
    currentTeamId: string;
};

const ParticipantPlaybooks = ({
    currentUserId,
    cachedPlaybookRuns,
    isTabletView,
    currentTeamId,
}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const [participantRuns, setParticipantRuns] = useState<Array<PlaybookRun | PlaybookRunModel>>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [showCachedWarning, setShowCachedWarning] = useState(false);
    const defaultHeight = useDefaultHeaderHeight();

    useEffect(() => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, Screens.PARTICIPANT_PLAYBOOKS);
    }, []);

    useAndroidHardwareBackHandler(Screens.PARTICIPANT_PLAYBOOKS, navigateBack);

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

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight;
        return {marginTop};
    }, [defaultHeight]);

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
        <View style={{flex: 1}}>
            {isTabletView &&
            <>
                <NavigationHeader
                    showBackButton={false}
                    isLargeTitle={false}
                    title={intl.formatMessage({id: 'playbooks.participant_playbooks.title', defaultMessage: 'Playbook checklists'})}
                />
                <View style={contextStyle}>
                    <RoundedHeaderContext/>
                </View>
                <View style={containerStyle}/>
            </>
            }
            <RunList
                location={Screens.PARTICIPANT_PLAYBOOKS}
                inProgressRuns={inProgressRuns}
                finishedRuns={finishedRuns}
                fetchMoreRuns={loadMore}
                showMoreButton={showMoreButton}
                fetching={loadingMore}
                loading={loading}
                showCachedWarning={showCachedWarning}
            />
        </View>
    );
};

export default ParticipantPlaybooks;
