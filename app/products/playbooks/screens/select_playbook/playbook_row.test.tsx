// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import CompassIcon from '@components/compass_icon';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookRow from './playbook_row';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any,
);

describe('PlaybookRow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof PlaybookRow> {
        return {
            playbook: TestHelper.fakePlaybook({
                title: 'Test Playbook',
            }),
            onPress: jest.fn(),
        };
    }

    it('renders playbook title correctly', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText('Test Playbook')).toBeTruthy();
    });

    it('renders public playbook icon correctly', () => {
        const props = getBaseProps();
        props.playbook.public = true;

        const {getByTestId} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('book-outline');
    });

    it('renders private playbook icon correctly', () => {
        const props = getBaseProps();
        props.playbook.public = false;

        const {getByTestId} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        const icon = getByTestId('compass-icon');
        expect(icon.props.name).toBe('book-lock-outline');
    });

    it('displays "Never used" when last_run_at is 0', () => {
        const props = getBaseProps();
        props.playbook.last_run_at = 0;

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText(/Never used/)).toBeTruthy();
    });

    it('displays "Last used" when last_run_at is set', () => {
        const lastRunAt = Date.now() - 3600000; // 1 hour ago
        const props = getBaseProps();
        props.playbook.last_run_at = lastRunAt;

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText(/Last used/)).toBeTruthy();
    });

    it('displays "No runs in progress" when active_runs is 0', () => {
        const props = getBaseProps();
        props.playbook.active_runs = 0;

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText(/No checklists in progress/)).toBeTruthy();
    });

    it('displays single run in progress correctly', () => {
        const props = getBaseProps();
        props.playbook.active_runs = 1;

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText(/1 checklist in progress/)).toBeTruthy();
    });

    it('displays multiple runs in progress correctly', () => {
        const props = getBaseProps();
        props.playbook.active_runs = 5;

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        expect(getByText(/5 checklists in progress/)).toBeTruthy();
    });

    it('calls onPress when pressed', async () => {
        const props = getBaseProps();

        const {getByText} = renderWithIntlAndTheme(
            <PlaybookRow {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Test Playbook'));
        });

        expect(props.onPress).toHaveBeenCalledTimes(1);
        expect(props.onPress).toHaveBeenCalledWith(props.playbook);
    });
});

