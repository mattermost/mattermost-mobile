// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View} from 'react-native';

import Loading from '@components/loading';
import MenuDivider from '@components/menu_divider';
import SectionNotice from '@components/section_notice';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useTabs, {type TabDefinition} from '@hooks/use_tabs';
import Tabs from '@hooks/use_tabs/tabs';
import {fetchPlaybookRunsPageForParticipant} from '@playbooks/actions/remote/runs';
import PlaybookScreens from '@playbooks/constants/screens';
import {isRunFinished} from '@playbooks/utils/run';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from '../playbooks_runs/empty_state';
import PlaybookCard, {CARD_HEIGHT} from '../playbooks_runs/playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    currentUserId: string;
    componentId: AvailableScreens;
    cachedPlaybookRuns: PlaybookRunModel[];
};

type TabsNames = 'in-progress' | 'finished';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        padding: 20,
    },
    tabContainer: {
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
    },
    warningText: {
        color: theme.centerChannelColor,
        fontSize: 14,
        lineHeight: 20,
    },
    warningContainer: {
        paddingTop: 8,
        paddingHorizontal: 16,
    },
}));

const messages = defineMessages({
    cachedWarningTitle: {
        id: 'playbooks.participant_playbooks.cached_warning_title',
        defaultMessage: 'Cannot reach the server',
    },
    cachedWarningMessage: {
        id: 'playbooks.participant_playbooks.cached_warning_message',
        defaultMessage: 'Showing cached data only. Some playbook runs or updates may be missing from this list.',
    },
    tabInProgress: {
        id: 'playbooks.participant_playbooks.tab_in_progress',
        defaultMessage: 'In Progress',
    },
    tabFinished: {
        id: 'playbooks.participant_playbooks.tab_finished',
        defaultMessage: 'Finished',
    },
});

const tabs: Array<TabDefinition<TabsNames>> = [
    {
        id: 'in-progress',
        name: messages.tabInProgress,
    },
    {
        id: 'finished',
        name: messages.tabFinished,
    },
];

const ParticipantPlaybooks = ({
    currentUserId,
    componentId,
    cachedPlaybookRuns,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const [participantRuns, setParticipantRuns] = useState<Array<PlaybookRun | PlaybookRunModel>>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasError, setHasError] = useState(false);
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
            setLoading(true);
            setHasError(false);
            setShowCachedWarning(false);
        }

        const result = await fetchPlaybookRunsPageForParticipant(serverUrl, currentUserId, page);

        if (result.error) {
            // Fallback to database cache only for the first page
            if (page === 0 && cachedPlaybookRuns.length > 0) {
                setParticipantRuns(cachedPlaybookRuns);
                setHasMore(false);
                setShowCachedWarning(true);
            } else {
                setHasError(true);
            }
        } else {
            const newRuns = result.runs || [];
            if (append) {
                setParticipantRuns((prev) => [...prev, ...newRuns]);
            } else {
                setParticipantRuns(newRuns);
            }
            setHasMore(result.hasMore || false);
            setCurrentPage(page);
        }

        if (append) {
            setLoadingMore(false);
        } else {
            setLoading(false);
        }
    }, [currentUserId, serverUrl, cachedPlaybookRuns]);

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

    const [activeTab, tabsProps] = useTabs<TabsNames>('in-progress', tabs);

    const data = activeTab === 'in-progress' ? inProgressRuns : finishedRuns;
    const isEmpty = data.length === 0;

    const renderItem: ListRenderItem<PlaybookRun> = useCallback(({item}) => {
        return (
            <PlaybookCard
                run={item}
                location={PlaybookScreens.PARTICIPANT_PLAYBOOKS}
            />
        );
    }, []);

    let content;
    if (loading) {
        content = <Loading testID='loading'/>;
    } else if (hasError || isEmpty) {
        content = (<EmptyState tab={activeTab}/>);
    } else {
        content = (
            <FlashList
                data={data}
                renderItem={renderItem}
                contentContainerStyle={styles.container}
                ItemSeparatorComponent={MenuDivider}
                estimatedItemSize={CARD_HEIGHT}
                onEndReached={loadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={loadingMore ? <Loading testID='loading.more'/> : undefined}
                testID={'runs.list'}
            />
        );
    }

    return (
        <>
            <View style={styles.tabContainer}>
                <Tabs {...tabsProps}/>
            </View>
            {showCachedWarning && (
                <View style={styles.warningContainer}>
                    <SectionNotice
                        title={intl.formatMessage(messages.cachedWarningTitle)}
                        location={PlaybookScreens.PARTICIPANT_PLAYBOOKS}
                        text={intl.formatMessage(messages.cachedWarningMessage)}
                        type='warning'
                    />
                </View>
            )}
            {content}
        </>
    );
};

export default ParticipantPlaybooks;
