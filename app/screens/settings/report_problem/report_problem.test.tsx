// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {navigateToSettingsScreen} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';

import ReportProblem from './report_problem';

jest.mock('@screens/navigation');

describe('screens/settings/report_problem/report_problem', () => {
    const baseProps = {
        allowDownloadLogs: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render report problem option', () => {
        const {getByTestId} = renderWithIntl(
            <ReportProblem {...baseProps}/>,
        );

        expect(getByTestId('settings.report_problem.option')).toBeTruthy();
    });

    it('should not render when type is hidden and logs are not allowed', () => {
        const props = {
            allowDownloadLogs: false,
            reportAProblemType: 'hidden',
        };

        const {queryByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        expect(queryByTestId('settings.report_problem.option')).toBeNull();
        expect(queryByTestId('settings.download_logs.option')).toBeNull();
    });

    it('should render the download logs option when type is hidden and logs are allowed', async () => {
        const props = {
            allowDownloadLogs: true,
            reportAProblemType: 'hidden',
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.download_logs.option'));
        });

        expect(navigateToSettingsScreen).toHaveBeenCalledWith(
            Screens.REPORT_PROBLEM,
            {title: 'Download app logs'},
        );
    });

    // The screen is where the troubleshooting metadata, the app logs and the attach logs toggle
    // live, so every configuration must be able to reach it. Which report action runs is decided
    // by the screen, so the license tier no longer takes part in this decision (MM-70111).
    it.each([
        ['email type', {allowDownloadLogs: true, reportAProblemType: 'email'}],
        ['email type without downloadable logs', {allowDownloadLogs: false, reportAProblemType: 'email'}],
        ['link type', {allowDownloadLogs: true, reportAProblemType: 'link'}],
        ['default type', {allowDownloadLogs: true, reportAProblemType: 'default'}],
        ['default type without downloadable logs', {allowDownloadLogs: false, reportAProblemType: 'default'}],
        ['old servers where the type is not defined', {allowDownloadLogs: true}],
    ])('should navigate to the report problem screen for %s', async (_, props) => {
        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
        });

        expect(navigateToSettingsScreen).toHaveBeenCalledWith(
            Screens.REPORT_PROBLEM,
            {title: 'Report a problem'},
        );
    });
});
