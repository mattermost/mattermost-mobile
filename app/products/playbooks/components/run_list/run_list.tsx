// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import Loading from '@components/loading';
import SectionNotice from '@components/section_notice';
import {useTheme} from '@context/theme';
import useTabs, {type TabDefinition} from '@hooks/use_tabs';
import Tabs from '@hooks/use_tabs/tabs';
import {goToSelectPlaybook} from '@playbooks/screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from './empty_state';
import PlaybookCard, {CARD_HEIGHT} from './playbook_card';
import ShowMoreButton from './show_more_button';

import type {RunListTabsNames} from './types';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    inProgressRuns: Array<PlaybookRunModel | PlaybookRun>;
    finishedRuns: Array<PlaybookRunModel | PlaybookRun>;
    fetchMoreRuns: (tab: 'in-progress' | 'finished') => void;
    showMoreButton: (tab: 'in-progress' | 'finished') => boolean;
    loading?: boolean;
    fetching: boolean;
    showCachedWarning?: boolean;
    channelId?: string;
};

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
    warningContainer: {
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    startANewRunButtonContainer: {
        padding: 20,
    },
}));

const ItemSeparator = () => {
    return <View style={itemSeparatorStyle.itemSeparator}/>;
};

const messages = defineMessages({
    cachedWarningTitle: {
        id: 'playbooks.run_list.cached_warning_title',
        defaultMessage: 'Cannot reach the server',
    },
    cachedWarningMessage: {
        id: 'playbooks.run_list.cached_warning_message',
        defaultMessage: 'Showing cached data only. Some updates may be missing from this list.',
    },
    tabInProgress: {
        id: 'playbooks.run_list.tab_in_progress',
        defaultMessage: 'In Progress',
    },
    tabFinished: {
        id: 'playbooks.run_list.tab_finished',
        defaultMessage: 'Finished',
    },
});

const tabs: Array<TabDefinition<RunListTabsNames>> = [
    {
        id: 'in-progress',
        name: messages.tabInProgress,
    },
    {
        id: 'finished',
        name: messages.tabFinished,
    },
];

const RunList = ({
    componentId,
    inProgressRuns,
    finishedRuns,
    fetchMoreRuns,
    showMoreButton,
    fetching,
    loading = false,
    showCachedWarning = false,
    channelId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const insets = useSafeAreaInsets();

    let initialTab: RunListTabsNames = 'in-progress';
    if (!inProgressRuns.length && finishedRuns.length) {
        initialTab = 'finished';
    }
    const [activeTab, tabsProps] = useTabs<RunListTabsNames>(initialTab, tabs);

    const data = activeTab === 'in-progress' ? inProgressRuns : finishedRuns;
    const isEmpty = data.length === 0;

    const onShowMorePress = useCallback(() => {
        fetchMoreRuns(activeTab);
    }, [fetchMoreRuns, activeTab]);

    const footerComponent = useMemo(() => (
        <ShowMoreButton
            fetching={fetching}
            onPress={onShowMorePress}
            visible={showMoreButton(activeTab)}
        />
    ), [fetching, onShowMorePress, showMoreButton, activeTab]);

    const startANewRunButtonContainerStyle = useMemo(() => {
        return [styles.startANewRunButtonContainer, {paddingBottom: insets.bottom}];
    }, [insets.bottom, styles]);

    const renderItem: ListRenderItem<PlaybookRunModel> = useCallback(({item}) => {
        return (
            <PlaybookCard
                run={item}
                location={componentId}
            />
        );
    }, [componentId]);

    const startANewRun = useCallback(() => {
        goToSelectPlaybook(intl, theme, channelId);
    }, [intl, theme, channelId]);

    let content;
    if (loading) {
        content = <Loading testID='loading'/>;
    } else if (isEmpty) {
        content = (<EmptyState tab={activeTab}/>);
    } else {
        content = (
            <>
                <FlashList
                    data={data}
                    renderItem={renderItem}
                    contentContainerStyle={styles.container}
                    ItemSeparatorComponent={ItemSeparator}
                    estimatedItemSize={CARD_HEIGHT}
                    ListFooterComponent={footerComponent}
                    testID='runs.list'
                />
            </>
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
                        location={componentId}
                        text={intl.formatMessage(messages.cachedWarningMessage)}
                        type='warning'
                    />
                </View>
            )}
            {content}
            <View style={startANewRunButtonContainerStyle}>
                <Button
                    emphasis='tertiary'
                    onPress={startANewRun}
                    text={intl.formatMessage({id: 'playbooks.runs.start_a_new_run', defaultMessage: 'New'})}
                    size='lg'
                    theme={theme}
                    iconName='play-outline'
                />
            </View>
        </>
    );
};

export default RunList;
