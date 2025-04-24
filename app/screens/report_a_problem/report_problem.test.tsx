// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import {Screens} from '@constants';
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

// We mock the app logs to simplify the testing and avoid
// warnings about updating component state outside of an act
jest.mock('@screens/report_a_problem/app_logs', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(AppLogs).mockImplementation(() => <View testID='app-logs'/>);

describe('screens/report_a_problem/report_problem', () => {
    const baseProps: ComponentProps<typeof ReportProblem> = {
        componentId: Screens.REPORT_PROBLEM,
        allowDownloadLogs: true,
        isLicensed: true,
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

    it('handles default report type when licensed', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'default',
            isLicensed: true,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(getDefaultReportAProblemLink).toHaveBeenCalledWith(true);
            expect(tryOpenURL).toHaveBeenCalledWith('default-link');
        });
    });

    it('handles default report type when not licensed', async () => {
        const props = {
            ...baseProps,
            reportAProblemType: 'default',
            isLicensed: false,
        };

        const {getByText} = renderWithIntl(
            <ReportProblem {...props}/>,
        );

        await act(async () => {
            fireEvent.press(getByText('Report a problem'));
            expect(getDefaultReportAProblemLink).toHaveBeenCalledWith(false);
            expect(tryOpenURL).toHaveBeenCalledWith('default-link');
        });
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
});
