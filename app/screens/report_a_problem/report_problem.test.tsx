// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences, Screens} from '@constants';
import {DEFAULT_REPORT_A_PROBLEM_EMAIL} from '@constants/report_a_problem';
import {renderWithIntl} from '@test/intl-test-helper';
import {logDebug} from '@utils/log';
import {emailLogs, getDefaultReportAProblemLink, shareLogs} from '@utils/share_logs';
import {tryOpenURL} from '@utils/url';

import AppLogs from './app_logs';
import ReportProblem from './report_problem';

jest.mock('@utils/share_logs', () => ({
    ...jest.requireActual('@utils/share_logs'),
    shareLogs: jest.fn(),
    emailLogs: jest.fn(),
    getDefaultReportAProblemLink: jest.fn().mockReturnValue('default-link'),
}));

jest.mock('@utils/url', () => ({
    tryOpenURL: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    popTopScreen: jest.fn(),
}));

jest.mock('@actions/remote/preference', () => ({
    savePreference: jest.fn(() => Promise.resolve({})),
}));

// We mock the app logs to simplify the testing and avoid
// warnings about updating component state outside of an act
jest.mock('@screens/report_a_problem/app_logs', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(AppLogs).mockImplementation(() => <View testID='app-logs'/>);

describe('screens/report_a_problem/report_problem', () => {
    const baseProps: ComponentProps<typeof ReportProblem> = {
        allowDownloadLogs: true,
        attachLogsEnabled: false,
        currentUserId: 'user1',
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

    it('renders with logs section when allowDownloadLogs is true', () => {
        const {getByText, getByTestId} = renderWithIntl(
            <ReportProblem {...baseProps}/>,
        );

        expect(getByText('Troubleshooting details')).toBeTruthy();
        expect(getByText('When reporting a problem, share the metadata and app logs given below to help troubleshoot your problem faster')).toBeTruthy();
        expect(getByTestId('app-logs')).toBeVisible();
    });

    it('renders without logs section when allowDownloadLogs is false', () => {
        const props = {...baseProps, allowDownloadLogs: false};
        const {getByText, queryByTestId} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        expect(getByText('When reporting a problem, share the metadata given below to help troubleshoot your problem faster')).toBeTruthy();
        expect(queryByTestId('app-logs')).not.toBeVisible();
    });

    it('handles email report type and allows sharing logs', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'email',
            reportAProblemMail: 'test@example.com',
            siteName: 'Test Site',
            allowDownloadLogs: true,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(emailLogs).toHaveBeenCalledWith(
                props.metadata,
                props.siteName,
                props.reportAProblemMail,
                false,
            );
        });
    });

    it('handles email report type and does not allow downloading logs', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'email',
            reportAProblemMail: 'test@example.com',
            siteName: 'Test Site',
            allowDownloadLogs: false,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(emailLogs).toHaveBeenCalledWith(
                props.metadata,
                props.siteName,
                props.reportAProblemMail,
                true,
            );
        });
    });

    it('handles link report type', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'link',
            reportAProblemLink: 'https://example.com/report',
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(tryOpenURL).toHaveBeenCalledWith(props.reportAProblemLink);
        });
    });

    it('handles missing report link', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'link',
            reportAProblemLink: undefined,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(logDebug).toHaveBeenCalledWith('Report a problem link is not set');
            expect(tryOpenURL).toHaveBeenCalledWith('default-link');
        });
    });

    it('handles default report type when paid edition', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'default',
            isFreeEdition: false,
            siteName: 'Test Site',
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(emailLogs).toHaveBeenCalledWith(props.metadata, props.siteName, DEFAULT_REPORT_A_PROBLEM_EMAIL, false);
            expect(tryOpenURL).not.toHaveBeenCalled();
        });
    });

    it('handles default report type when free edition', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'default',
            isFreeEdition: true,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(getDefaultReportAProblemLink).toHaveBeenCalledWith(false);
            expect(tryOpenURL).toHaveBeenCalledWith('default-link');
            expect(emailLogs).not.toHaveBeenCalled();
        });
    });

    it('does nothing when reportAProblemType is hidden', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'hidden',
        };

        // The button is not rendered when type is hidden, but if handleReport
        // were called directly it should be a no-op.
        const {queryByText} = renderWithIntl(<ReportProblem {...props}/>);

        expect(queryByText('Report a problem')).toBeNull();
        expect(emailLogs).not.toHaveBeenCalled();
        expect(tryOpenURL).not.toHaveBeenCalled();
        expect(shareLogs).not.toHaveBeenCalled();
    });

    it('handles legacy behavior when reportAProblemType is not defined', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: undefined,
            reportAProblemLink: 'https://example.com/report',
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(tryOpenURL).toHaveBeenCalledWith(props.reportAProblemLink);
        });
    });

    it('handles legacy behavior with no link', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: undefined,
            reportAProblemLink: undefined,
            reportAProblemMail: 'test@example.com',
            siteName: 'Test Site',
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(shareLogs).toHaveBeenCalledWith(
                props.metadata,
                props.siteName,
                undefined,
                false,
            );
        });
    });

    describe('attach logs toggle', () => {
        it('should render toggle when allowDownloadLogs is true', () => {
            const props = {...baseProps, allowDownloadLogs: true};
            const {getByText} = renderWithIntl(
                <ReportProblem {...props}/>,
            );

            expect(getByText('Enable app log attachments')).toBeTruthy();
        });

        it('should not render toggle when allowDownloadLogs is false', () => {
            const props = {...baseProps, allowDownloadLogs: false};
            const {queryByText} = renderWithIntl(
                <ReportProblem {...props}/>,
            );

            expect(queryByText('Enable app log attachments')).toBeNull();
        });

        it('should call savePreference when toggle is pressed', async () => {
            const props = {...baseProps, allowDownloadLogs: true, attachLogsEnabled: false};
            const {getByTestId} = renderWithIntl(
                <ReportProblem {...props}/>,
            );

            const switchButton = getByTestId('report_problem.enable_log_attachments.toggled.false.button');

            await act(async () => {
                fireEvent(switchButton, 'valueChange', true);
            });

            expect(savePreference).toHaveBeenCalledWith(expect.any(String), [{
                user_id: 'user1',
                category: Preferences.CATEGORIES.ADVANCED_SETTINGS,
                name: Preferences.ATTACH_APP_LOGS,
                value: 'true',
            }]);
        });

        it('should rollback toggle on savePreference error', async () => {
            jest.mocked(savePreference).mockResolvedValueOnce({error: 'some error'});

            const props = {...baseProps, allowDownloadLogs: true, attachLogsEnabled: false};
            const {getByTestId} = renderWithIntl(
                <ReportProblem {...props}/>,
            );

            const switchButton = getByTestId('report_problem.enable_log_attachments.toggled.false.button');

            await act(async () => {
                fireEvent(switchButton, 'valueChange', true);
            });

            expect(savePreference).toHaveBeenCalledWith(expect.any(String), [{
                user_id: 'user1',
                category: Preferences.CATEGORIES.ADVANCED_SETTINGS,
                name: Preferences.ATTACH_APP_LOGS,
                value: 'true',
            }]);

            // After the error, the toggle should revert to false.
            // The Switch testID with 'false' should be present again after rollback.
            expect(getByTestId('report_problem.enable_log_attachments.toggled.false.button')).toBeTruthy();
        });
    });
});
