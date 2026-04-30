// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {DEFAULT_REPORT_A_PROBLEM_EMAIL} from '@constants/report_a_problem';
import {goToScreen} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {emailLogs, getDefaultReportAProblemLink} from '@utils/share_logs';
import {tryOpenURL} from '@utils/url';

import ReportProblem from './report_problem';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));

jest.mock('@utils/share_logs', () => ({
    emailLogs: jest.fn(),
    getDefaultReportAProblemLink: jest.fn().mockReturnValue('default-forum-link'),
}));

jest.mock('@utils/url', () => ({
    tryOpenURL: jest.fn(),
}));

describe('screens/settings/report_problem/report_problem', () => {
    const baseProps = {
        allowDownloadLogs: true,
        attachLogsEnabled: false,
        isFreeEdition: false,
        metadata: {
            currentUserId: 'user1',
            currentTeamId: 'team1',
            serverVersion: '7.8.0',
            appVersion: '2.0.0',
            appPlatform: 'ios',
            deviceModel: 'iPhone 14',
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

    it('should open forum link directly when type is default and free edition', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'default',
            isFreeEdition: true,
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
            expect(getDefaultReportAProblemLink).toHaveBeenCalledWith(false);
            expect(tryOpenURL).toHaveBeenCalledWith('default-forum-link');
            expect(goToScreen).not.toHaveBeenCalled();
        });
    });

    it('should email directly when type is default, paid edition, and logs not allowed', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: false,
            reportAProblemType: 'default',
            isFreeEdition: false,
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
                DEFAULT_REPORT_A_PROBLEM_EMAIL,
                true,
            );
            expect(goToScreen).not.toHaveBeenCalled();
        });
    });

    it('should email directly when type is default, paid edition, and logs auto-attached', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: true,
            attachLogsEnabled: true,
            reportAProblemType: 'default',
            isFreeEdition: false,
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
                DEFAULT_REPORT_A_PROBLEM_EMAIL,
                false,
            );
            expect(goToScreen).not.toHaveBeenCalled();
        });
    });

    it('should navigate to screen when type is default, paid edition, logs allowed, and not auto-attached', async () => {
        const props = {
            ...baseProps,
            allowDownloadLogs: true,
            attachLogsEnabled: false,
            reportAProblemType: 'default',
            isFreeEdition: false,
        };

        const {getByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('settings.report_problem.option'));
            expect(goToScreen).toHaveBeenCalledWith(Screens.REPORT_PROBLEM, 'Report a problem');
            expect(emailLogs).not.toHaveBeenCalled();
            expect(tryOpenURL).not.toHaveBeenCalled();
        });
    });
});
