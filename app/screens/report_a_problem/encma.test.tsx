// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';
import {emailLogs, shareLogs} from '@utils/share_logs';
import {tryOpenURL} from '@utils/url';

import ReportProblem from './report_problem';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@utils/share_logs', () => ({
    ...jest.requireActual('@utils/share_logs'),
    shareLogs: jest.fn(),
    emailLogs: jest.fn(),
    getDefaultReportAProblemLink: jest.fn(),
}));

jest.mock('@utils/url', () => ({
    tryOpenURL: jest.fn(),
}));

jest.mock('@actions/remote/preference', () => ({
    savePreference: jest.fn().mockResolvedValue({}),
}));

jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('./app_logs', () => () => null);

const baseProps: ComponentProps<typeof ReportProblem> = {
    allowDownloadLogs: true,
    attachLogsEnabled: false,
    currentUserId: 'user-id',
    isFreeEdition: false,
    metadata: {
        currentUserId: 'user-id',
        currentTeamId: 'team-id',
        serverVersion: '11.7.0',
        appVersion: '1.0.0',
        appPlatform: 'android',
        deviceModel: 'Pixel',
    },
    siteName: 'Mattermost',
};

describe('ENCMA report a problem destinations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['default', undefined],
        ['link', 'https://mattermost.com/pl/report_a_problem_unlicensed'],
    ])('uses the share flow instead of an upstream destination for %s reporting', async (reportAProblemType, reportAProblemLink) => {
        renderWithIntl(
            <ReportProblem
                {...baseProps}
                reportAProblemType={reportAProblemType}
                reportAProblemLink={reportAProblemLink}
            />,
        );

        await act(async () => {
            fireEvent.press(screen.getByText('Report a problem'));
        });

        expect(shareLogs).toHaveBeenCalledWith(baseProps.metadata, 'Mattermost', undefined, false);
        expect(emailLogs).not.toHaveBeenCalled();
        expect(tryOpenURL).not.toHaveBeenCalled();
    });

    it('retains a custom administrator support link', async () => {
        const reportAProblemLink = 'https://support.example.org/report';
        renderWithIntl(
            <ReportProblem
                {...baseProps}
                reportAProblemType='link'
                reportAProblemLink={reportAProblemLink}
            />,
        );

        await act(async () => {
            fireEvent.press(screen.getByText('Report a problem'));
        });

        expect(tryOpenURL).toHaveBeenCalledWith(reportAProblemLink);
        expect(shareLogs).not.toHaveBeenCalled();
    });
});
