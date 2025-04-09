// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useMemo} from 'react';
import {defineMessage} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useTabs, {type TabDefinition} from '@hooks/use_tabs';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from './empty_state';
import PlaybookCard from './playbook_card';

import type PlaybookRunModel from '@typings/database/models/servers/playbook_run_model';

type Props = {
    allRuns: PlaybookRunModel[];
};

type Tabs = 'in-progress' | 'finished';

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

const tabs: Array<TabDefinition<Tabs>> = [
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
    allRuns,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const [inProgressRuns, finishedRuns] = useMemo(() => {
        const inProgress: PlaybookRunModel[] = [];
        const finished: PlaybookRunModel[] = [];

        allRuns.forEach((run) => {
            if (run.end_at) {
                finished.push(run);
            } else {
                inProgress.push(run);
            }
        });

        return [inProgress, finished] as const;
    }, [allRuns]);

    const initialTab: Tabs = inProgressRuns.length ? 'in-progress' : 'finished';
    const [activeTab, tabsComponent] = useTabs<Tabs>(initialTab, tabs);

    const data = activeTab === 'in-progress' ? inProgressRuns : finishedRuns;
    const isEmpty = data.length === 0;

    const renderItem: ListRenderItem<PlaybookRunModel> = useCallback(({item}) => {
        return (
            <PlaybookCard
                run={item}
                location={Screens.PLAYBOOKS_RUNS}
            />
        );
    }, []);

    let content = (<EmptyState tab={activeTab}/>);
    if (!isEmpty) {
        content = (
            <FlashList
                data={data}
                renderItem={renderItem}
                contentContainerStyle={styles.container}
                ItemSeparatorComponent={ItemSeparator}
            />
        );
    }

    return (
        <>
            <View style={styles.tabContainer}>
                {tabsComponent}
            </View>
            {content}
        </>
    );
};

export default PlaybookRuns;
