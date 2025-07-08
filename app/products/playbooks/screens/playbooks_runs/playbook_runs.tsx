// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useTabs, {type TabDefinition} from '@hooks/use_tabs';
import Tabs from '@hooks/use_tabs/tabs';
import {fetchFinishedRunsForChannel} from '@playbooks/actions/remote/runs';
import {isRunFinished} from '@playbooks/utils/run';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from './empty_state';
import PlaybookCard, {CARD_HEIGHT} from './playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    allRuns: PlaybookRunModel[];
    componentId: AvailableScreens;
};

type TabsNames = 'in-progress' | 'finished';

const itemSeparatorStyle = StyleSheet.create({
    itemSeparator: {
        height: 12,
    },
});
const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        padding: 20,
    },
    tabContainer: {
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
    },
}));

const ItemSeparator = () => {
    return <View style={itemSeparatorStyle.itemSeparator}/>;
};

const tabs: Array<TabDefinition<TabsNames>> = [
    {
        id: 'in-progress',
        name: defineMessage({
            id: 'playbook.runs.in-progress',
            defaultMessage: 'In Progress',
        }),
    },
    {
        id: 'finished',
        name: defineMessage({
            id: 'playbook.runs.finished',
            defaultMessage: 'Finished',
        }),
    },
];

const PlaybookRuns = ({
    channelId,
    allRuns,
    componentId,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const [fetchedFinishedRuns, setFetchedFinishedRuns] = useState<PlaybookRun[]>([]);

    const exit = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, exit);

    const [inProgressRuns, finishedRuns] = useMemo(() => {
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
    const hasMoreFinishedRuns = useRef(true);
    const finishedRunsPage = useRef(0);
    const fetching = useRef(false);

    const initialTab: TabsNames = inProgressRuns.length ? 'in-progress' : 'finished';
    const [activeTab, tabsProps] = useTabs<TabsNames>(initialTab, tabs);

    let data: Array<PlaybookRunModel | PlaybookRun> = inProgressRuns;
    if (activeTab === 'finished') {
        if (fetchedFinishedRuns.length) {
            data = fetchedFinishedRuns;
        } else {
            data = finishedRuns;
        }
    }

    const isEmpty = data.length === 0;

    const renderItem: ListRenderItem<PlaybookRunModel> = useCallback(({item}) => {
        return (
            <PlaybookCard
                run={item}
                location={Screens.PLAYBOOKS_RUNS}
            />
        );
    }, []);

    const fetchFinishedRuns = useCallback(async () => {
        if (fetching.current) {
            return;
        }
        fetching.current = true;
        const {runs, has_more, error} = await fetchFinishedRunsForChannel(serverUrl, channelId, finishedRunsPage.current);
        fetching.current = false;
        if (error) {
            hasMoreFinishedRuns.current = false;
            return;
        }
        hasMoreFinishedRuns.current = has_more ?? false;
        finishedRunsPage.current++;
        if (runs?.length) {
            setFetchedFinishedRuns(runs);
        }
    }, [channelId, serverUrl]);

    const onFinishedRunsReachEnd = useCallback(() => {
        if (hasMoreFinishedRuns.current) {
            fetchFinishedRuns();
        }
    }, [fetchFinishedRuns]);

    useEffect(() => {
        if (activeTab === 'finished' && hasMoreFinishedRuns.current && !finishedRuns.length) {
            fetchFinishedRuns();
        }
    }, [activeTab, fetchFinishedRuns, finishedRuns.length]);

    let content = (<EmptyState tab={activeTab}/>);
    if (!isEmpty) {
        content = (
            <FlashList
                data={data}
                renderItem={renderItem}
                contentContainerStyle={styles.container}
                ItemSeparatorComponent={ItemSeparator}
                estimatedItemSize={CARD_HEIGHT}
                onEndReached={activeTab === 'finished' ? onFinishedRunsReachEnd : undefined}
            />
        );
    }

    return (
        <>
            <View style={styles.tabContainer}>
                <Tabs {...tabsProps}/>
            </View>
            {content}
        </>
    );
};

export default PlaybookRuns;
