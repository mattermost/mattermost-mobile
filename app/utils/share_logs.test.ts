// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import {Alert} from 'react-native';
import Share from 'react-native-share';

import {shareLogs, getDefaultReportAProblemLink, metadataToString} from './share_logs';

jest.mock('react-native-share', () => ({
    open: jest.fn(),
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
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const logPaths = ['/path/to/log1', '/path/to/log2'];
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(logPaths);
    });

    it('should share logs with attachments when excludeLogs is false', async () => {
        await shareLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site React Native app',
            email: 'support@example.com',
            urls: ['file:///path/to/log1', 'file:///path/to/log2'],
        }));
    });

    it('should handle an empty list of log paths', async () => {
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);

        await shareLogs(metadata, 'My Site', 'support@example.com', false);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site React Native app',
            email: 'support@example.com',
            urls: undefined,
        }));
    });

    it('should share without logs when excludeLogs is true', async () => {
        await shareLogs(metadata, 'My Site', 'support@example.com', true);

        expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Problem with My Site React Native app',
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
        };

        const string = metadataToString(metadata);
        expect(string).toBe('Current User ID: user1\nCurrent Team ID: team1\nServer Version: 1.0.0\nApp Version: 2.0.0\nApp Platform: ios');
    });
});
