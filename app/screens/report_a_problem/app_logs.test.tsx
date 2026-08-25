// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import RNUtils from '@mattermost/rnutils';
import {act, fireEvent, waitFor, waitForElementToBeRemoved} from '@testing-library/react-native';
import React from 'react';
import {Platform} from 'react-native';
import Share from 'react-native-share';

import {renderWithIntl} from '@test/intl-test-helper';
import {deleteFile} from '@utils/file';
import {logDebug} from '@utils/log';

import AppLogs from './app_logs';
jest.mock('react-native-share', () => ({
    open: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    deleteFile: jest.fn(),
}));

describe('screens/report_a_problem/app_logs', () => {
    const file1 = 'log1.txt';
    const file2 = 'log2.txt';
    const logPaths = [`/path/to/${file1}`, `/path/to/${file2}`];
    const zipPath = '/path/to/logs.zip';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue(logPaths);
        jest.mocked(RNUtils.createZipFile).mockResolvedValue(zipPath);
    });

    it('renders loading state initially', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        expect(getByTestId('logs-loading')).toBeTruthy();
        expect(getByText('Download App Logs')).toBeDisabled();

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        jest.useRealTimers();
    });

    it('renders log files after loading', async () => {
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));

        expect(getByText(/Logs_/)).toBeTruthy();
        expect(getByText('Download App Logs')).toBeEnabled();
    });

    it('handles download on iOS', async () => {
        Platform.OS = 'ios';
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        await waitFor(() => expect(getByText('Download App Logs')).toBeEnabled());

        await act(async () => {
            fireEvent.press(getByTestId('app_logs_download_button'));
        });

        expect(RNUtils.createZipFile).toHaveBeenCalledWith(logPaths);
        expect(Share.open).toHaveBeenCalledWith({
            url: 'file://' + zipPath,
            saveToFiles: true,
        });
        expect(deleteFile).toHaveBeenCalledWith(zipPath);
    });

    it('handles download on Android', async () => {
        Platform.OS = 'android';
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        await waitFor(() => expect(getByText('Download App Logs')).toBeEnabled());

        await act(async () => {
            fireEvent.press(getByTestId('app_logs_download_button'));
        });

        expect(RNUtils.createZipFile).toHaveBeenCalledWith(logPaths);
        expect(RNUtils.saveFile).toHaveBeenCalledWith(zipPath);
        expect(deleteFile).toHaveBeenCalledWith(zipPath);
    });

    it('handles errors during zip creation', async () => {
        jest.mocked(RNUtils.createZipFile).mockRejectedValue(new Error('Zip failed'));
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        await waitFor(() => expect(getByText('Download App Logs')).toBeEnabled());

        await act(async () => {
            fireEvent.press(getByTestId('app_logs_download_button'));
        });

        expect(RNUtils.createZipFile).toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('Failed to create save file', new Error('Zip failed'));
        expect(deleteFile).not.toHaveBeenCalled();
    });

    it('handles errors during file deletion', async () => {
        jest.mocked(deleteFile).mockImplementation(() => {
            throw new Error('Delete failed');
        });
        const {getByTestId, getByText} = renderWithIntl(
            <AppLogs/>,
        );

        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        await waitFor(() => expect(getByText('Download App Logs')).toBeEnabled());

        await act(async () => {
            fireEvent.press(getByTestId('app_logs_download_button'));
        });

        expect(RNUtils.createZipFile).toHaveBeenCalled();
        expect(deleteFile).toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('Failed to delete zip file', new Error('Delete failed'));
    });

    it('handles empty log paths', async () => {
        jest.mocked(TurboLogger.getLogPaths).mockResolvedValue([]);
        const {getByText, getByTestId} = renderWithIntl(
            <AppLogs/>,
        );
        await waitForElementToBeRemoved(() => getByTestId('logs-loading'));
        expect(getByText('Download App Logs')).toBeDisabled();
    });
});
