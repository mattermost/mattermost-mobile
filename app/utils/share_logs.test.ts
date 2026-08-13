// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import {Alert} from 'react-native';
import Share from 'react-native-share';

import {shareLogs, getDefaultReportAProblemLink, metadataToString, emailLogs} from './share_logs';

jest.mock('react-native-share', () => ({
    open: jest.fn(),
    shareSingle: jest.fn(),
    Social: {
        EMAIL: 'email',
    },
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
    alert: jest.fn(),
}));

describe('shareLogs', () => {
    const metadata = {
        currentUserId: 'user1',
        currentTeamId: 'team1',
        serverVersion: '1.0.0',
        appVersion: '2.0.0',
        appPlatform: 'ios',
        deviceModel: 'iPhone 14',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const logPaths = ['/path/to/log1', '/path/to/log2'];
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(logPaths);
    });

    it('should share logs with attachments when excludeLogs is false', async () => {
        await shareLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site mobile app',
            email: 'support@example.com',
            urls: ['file:///path/to/log1', 'file:///path/to/log2'],
        }));
    });

    it('should handle an empty list of log paths', async () => {
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);

        await shareLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site mobile app',
            email: 'support@example.com',
            urls: undefined,
        }));
    });

    it('should share without logs when excludeLogs is true', async () => {
        await shareLogs(metadata, 'My Site', 'support@example.com', true);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site mobile app',
            email: 'support@example.com',
            urls: undefined,
        }));
    });

    it('should handle errors', async () => {
        const error = new Error('Share failed');
        jest.mocked(Share.open).mockRejectedValue(error);

        await shareLogs(metadata, 'My Site', 'support@example.com');

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Error: Share failed');
    });

    it('should pass the correct metadata to the share function', async () => {
        await shareLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Current User ID: user1'),
        }));

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Current Team ID: team1'),
        }));

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Server Version: 1.0.0'),
        }));

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('App Version: 2.0.0'),
        }));

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('App Platform: ios'),
        }));
    });
});

describe('emailLogs', () => {
    const metadata = {
        currentUserId: 'user1',
        currentTeamId: 'team1',
        serverVersion: '1.0.0',
        appVersion: '2.0.0',
        appPlatform: 'ios',
        deviceModel: 'iPhone 14',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const logPaths = ['/path/to/log1', '/path/to/log2'];
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(logPaths);
    });

    it('should open email composer with attachments when excludeLogs is false', async () => {
        await emailLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site mobile app',
            email: 'support@example.com',
            urls: ['file:///path/to/log1', 'file:///path/to/log2'],
            social: Share.Social.EMAIL,
        }));
    });

    it('should fall back to Mattermost in subject when siteName is undefined', async () => {
        await emailLogs(metadata, undefined, 'support@example.com', false);

        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with Mattermost mobile app',
        }));
    });

    it('should handle an empty list of log paths', async () => {
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);

        await emailLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            email: 'support@example.com',
            urls: undefined,
            social: Share.Social.EMAIL,
        }));
    });

    it('should open email composer without attachments when excludeLogs is true', async () => {
        await emailLogs(metadata, 'My Site', 'support@example.com', true);

        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            email: 'support@example.com',
            urls: undefined,
            social: Share.Social.EMAIL,
        }));
    });

    it('should handle errors', async () => {
        const error = new Error('Share failed');
        jest.mocked(Share.shareSingle).mockRejectedValue(error);

        await emailLogs(metadata, 'My Site', 'support@example.com');

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Error: Share failed');
    });

    it('should include the body template with metadata in the message', async () => {
        await emailLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Please share a description of the problem with reproduction steps:'),
        }));
        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('You may also attach the mobile logs and any relevant screen captures.'),
        }));
        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('App metadata'),
        }));
        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Current User ID: user1'),
        }));
        expect(Share.shareSingle).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Device Model: iPhone 14'),
        }));
    });
});

describe('getDefaultReportAProblemLink', () => {
    it('should return licensed link when isLicensed is true', () => {
        const link = getDefaultReportAProblemLink(true);
        expect(link).toBe('https://mattermost.com/pl/report_a_problem_licensed');
    });

    it('should return unlicensed link when isLicensed is false', () => {
        const link = getDefaultReportAProblemLink(false);
        expect(link).toBe('https://mattermost.com/pl/report_a_problem_unlicensed');
    });
});

describe('metadataToString', () => {
    it('should return a string with the correct metadata', () => {
        const metadata = {
            currentUserId: 'user1',
            currentTeamId: 'team1',
            serverVersion: '1.0.0',
            appVersion: '2.0.0',
            appPlatform: 'ios',
            deviceModel: 'iPhone 14',
        };

        const string = metadataToString(metadata);
        expect(string).toBe('Current User ID: user1\nCurrent Team ID: team1\nServer Version: 1.0.0\nApp Version: 2.0.0\nApp Platform: ios\nDevice Model: iPhone 14');
    });
});
