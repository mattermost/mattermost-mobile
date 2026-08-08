// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import MenuDivider from '@components/menu_divider';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
import {areDefaultTaskFilters, DEFAULT_TASK_FILTERS, NO_TASK_FILTERS, type TaskFilters} from '@playbooks/utils/task_filters';
import BottomSheetContent, {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    sectionHeader: {
        ...typography('Heading', 25, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.56),
        textTransform: 'uppercase',
        paddingTop: 12,
        paddingBottom: 4,
    },
}));

const messages = defineMessages({
    title: {
        id: 'playbooks.task_filter.title',
        defaultMessage: 'Filter tasks',
    },
    allTasks: {
        id: 'playbooks.task_filter.all_tasks',
        defaultMessage: 'All tasks',
    },
    taskState: {
        id: 'playbooks.task_filter.task_state',
        defaultMessage: 'Task state',
    },
    showChecked: {
        id: 'playbooks.task_filter.show_checked',
        defaultMessage: 'Show checked tasks',
    },
    showSkipped: {
        id: 'playbooks.task_filter.show_skipped',
        defaultMessage: 'Show skipped tasks',
    },
    assignee: {
        id: 'playbooks.task_filter.assignee',
        defaultMessage: 'Assignee',
    },
    me: {
        id: 'playbooks.task_filter.me',
        defaultMessage: 'Me',
    },
    unassigned: {
        id: 'playbooks.task_filter.unassigned',
        defaultMessage: 'Unassigned',
    },
    others: {
        id: 'playbooks.task_filter.others',
        defaultMessage: 'Others',
    },
});

const SECTION_HEADER_HEIGHT = 40;
const NUMBER_OF_OPTIONS = 6;
const NUMBER_OF_SECTIONS = 2;
const DIVIDERS_HEIGHT = 2;

export const TASK_FILTER_SNAP_POINT = bottomSheetSnapPoint(NUMBER_OF_OPTIONS, ITEM_HEIGHT) +
    TITLE_HEIGHT + (NUMBER_OF_SECTIONS * SECTION_HEADER_HEIGHT) + DIVIDERS_HEIGHT;

type Props = {
    filters: TaskFilters;
    onFiltersChanged: (filters: TaskFilters) => void;
}

const TaskFilter = ({filters, onFiltersChanged}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // The sheet owns the working copy so each toggle re-renders immediately; the run screen is kept
    // in sync on every change so the task list filters live behind the sheet.
    const [selected, setSelected] = useState(filters);

    const update = useCallback((changes: Partial<TaskFilters>) => {
        setSelected((prev) => {
            const next = {...prev, ...changes};
            onFiltersChanged(next);
            return next;
        });
    }, [onFiltersChanged]);

    // Acts as a select-all checkbox: it turns every filter on, or clears them all when they are already on.
    const toggleAll = useCallback(() => {
        const next = areDefaultTaskFilters(selected) ? NO_TASK_FILTERS : DEFAULT_TASK_FILTERS;
        setSelected(next);
        onFiltersChanged(next);
    }, [onFiltersChanged, selected]);

    const toggleChecked = useCallback(() => update({showChecked: !selected.showChecked}), [selected.showChecked, update]);
    const toggleSkipped = useCallback(() => update({showSkipped: !selected.showSkipped}), [selected.showSkipped, update]);
    const toggleMe = useCallback(() => update({showAssignedToMe: !selected.showAssignedToMe}), [selected.showAssignedToMe, update]);
    const toggleUnassigned = useCallback(() => update({showUnassigned: !selected.showUnassigned}), [selected.showUnassigned, update]);
    const toggleOthers = useCallback(() => update({showAssignedToOthers: !selected.showAssignedToOthers}), [selected.showAssignedToOthers, update]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={true}
            title={intl.formatMessage(messages.title)}
            testID='playbooks.task_filter'
        >
            <View>
                <OptionItem
                    label={intl.formatMessage(messages.allTasks)}
                    type='select'
                    selected={areDefaultTaskFilters(selected)}
                    action={toggleAll}
                    testID='playbooks.task_filter.all_tasks'
                />
                <MenuDivider/>
                <Text style={styles.sectionHeader}>
                    {intl.formatMessage(messages.taskState)}
                </Text>
                <OptionItem
                    label={intl.formatMessage(messages.showChecked)}
                    type='select'
                    selected={selected.showChecked}
                    action={toggleChecked}
                    testID='playbooks.task_filter.show_checked'
                />
                <OptionItem
                    label={intl.formatMessage(messages.showSkipped)}
                    type='select'
                    selected={selected.showSkipped}
                    action={toggleSkipped}
                    testID='playbooks.task_filter.show_skipped'
                />
                <MenuDivider/>
                <Text style={styles.sectionHeader}>
                    {intl.formatMessage(messages.assignee)}
                </Text>
                <OptionItem
                    label={intl.formatMessage(messages.me)}
                    type='select'
                    selected={selected.showAssignedToMe}
                    action={toggleMe}
                    testID='playbooks.task_filter.me'
                />
                <OptionItem
                    label={intl.formatMessage(messages.unassigned)}
                    type='select'
                    selected={selected.showUnassigned}
                    action={toggleUnassigned}
                    testID='playbooks.task_filter.unassigned'
                />
                <OptionItem
                    label={intl.formatMessage(messages.others)}
                    type='select'
                    selected={selected.showAssignedToOthers}
                    action={toggleOthers}
                    testID='playbooks.task_filter.others'
                />
            </View>
        </BottomSheetContent>
    );
};

export default TaskFilter;
