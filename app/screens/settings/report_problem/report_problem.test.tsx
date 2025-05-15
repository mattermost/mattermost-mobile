// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {emailLogs} from '@utils/share_logs';

import ReportProblem from './report_problem';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));

jest.mock('@utils/share_logs', () => ({
    emailLogs: jest.fn(),
}));

describe('screens/settings/report_problem/report_problem', () => {
    const baseProps = {
        allowDownloadLogs: true,
        metadata: {
            currentUserId: 'user1',
            currentTeamId: 'team1',
            serverVersion: '7.8.0',
            appVersion: '2.0.0',
            appPlatform: 'ios',
        },
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

    it('should not render when type is hidden', () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'hidden',
        };

        const {queryByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        expect(queryByTestId('settings.report_problem.option')).toBeNull();
    });

    it('should navigate to report problem screen when logs are allowed', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: true,
            reportAProblemType: 'email',
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.REPORT_PROBLEM,
                'Report a problem',
            );
        });
    });

    it('should navigate to report problem screen when type is not email', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: false,
            reportAProblemType: 'link',
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.REPORT_PROBLEM,
                'Report a problem',
            );
        });
    });

    it('should share logs directly when logs are not allowed and type is email', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: false,
            reportAProblemType: 'email',
            reportAProblemMail: 'test@example.com',
            siteName: 'Test Site',
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
            expect(emailLogs).toHaveBeenCalledWith(
                props.metadata,
                props.siteName,
                props.reportAProblemMail,
                true,
            );
            expect(goToScreen).not.toHaveBeenCalled();
        });
    });
});
