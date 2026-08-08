// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import OptionItem from '@components/option_item';
import {DEFAULT_TASK_FILTERS, NO_TASK_FILTERS} from '@playbooks/utils/task_filters';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';

import TaskFilter from './index';

jest.mock('@components/option_item', () => ({
    __esModule: true,
    default: jest.fn(),
    ITEM_HEIGHT: 48,
}));
jest.mocked(OptionItem).mockImplementation(
    (props: ComponentProps<typeof OptionItem>) => React.createElement('OptionItem', {...props, testID: props.testID}),
);

describe('TaskFilter', () => {
    function getBaseProps(): ComponentProps<typeof TaskFilter> {
        return {
            filters: DEFAULT_TASK_FILTERS,
            onFiltersChanged: jest.fn(),
        };
    }

    it('should show every option selected when no filter is applied', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        expect(getByTestId('playbooks.task_filter.all_tasks').props.selected).toBe(true);
        expect(getByTestId('playbooks.task_filter.show_checked').props.selected).toBe(true);
        expect(getByTestId('playbooks.task_filter.show_skipped').props.selected).toBe(true);
        expect(getByTestId('playbooks.task_filter.me').props.selected).toBe(true);
        expect(getByTestId('playbooks.task_filter.unassigned').props.selected).toBe(true);
        expect(getByTestId('playbooks.task_filter.others').props.selected).toBe(true);
    });

    it('should turn a filter off and report it', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        act(() => {
            getByTestId('playbooks.task_filter.show_checked').props.action();
        });

        expect(props.onFiltersChanged).toHaveBeenCalledWith({...DEFAULT_TASK_FILTERS, showChecked: false});
    });

    it('should stop showing All tasks as selected once a filter is off', () => {
        const props = getBaseProps();
        props.filters = {...DEFAULT_TASK_FILTERS, showSkipped: false};
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        expect(getByTestId('playbooks.task_filter.all_tasks').props.selected).toBe(false);
        expect(getByTestId('playbooks.task_filter.show_skipped').props.selected).toBe(false);
    });

    it('should restore every filter when All tasks is pressed while partially selected', () => {
        const props = getBaseProps();
        props.filters = {
            showChecked: false,
            showSkipped: false,
            showAssignedToMe: false,
            showUnassigned: true,
            showAssignedToOthers: false,
        };
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        act(() => {
            getByTestId('playbooks.task_filter.all_tasks').props.action();
        });

        expect(props.onFiltersChanged).toHaveBeenCalledWith(DEFAULT_TASK_FILTERS);
        expect(getByTestId('playbooks.task_filter.show_checked').props.selected).toBe(true);
    });

    it('should clear every filter when All tasks is pressed while fully selected', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        expect(getByTestId('playbooks.task_filter.all_tasks').props.selected).toBe(true);

        act(() => {
            getByTestId('playbooks.task_filter.all_tasks').props.action();
        });

        expect(props.onFiltersChanged).toHaveBeenCalledWith(NO_TASK_FILTERS);
        expect(getByTestId('playbooks.task_filter.all_tasks').props.selected).toBe(false);
        expect(getByTestId('playbooks.task_filter.show_checked').props.selected).toBe(false);
        expect(getByTestId('playbooks.task_filter.others').props.selected).toBe(false);
    });

    it('should select everything again when All tasks is pressed twice', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<TaskFilter {...props}/>);

        act(() => {
            getByTestId('playbooks.task_filter.all_tasks').props.action();
        });
        act(() => {
            getByTestId('playbooks.task_filter.all_tasks').props.action();
        });

        expect(props.onFiltersChanged).toHaveBeenLastCalledWith(DEFAULT_TASK_FILTERS);
        expect(getByTestId('playbooks.task_filter.all_tasks').props.selected).toBe(true);
    });
});
