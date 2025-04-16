// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import React from 'react';

import {getFileSize} from '@utils/file';

import ZipContainer from './zip_container';

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    getFileSize: jest.fn(),
}));

describe('screens/report_a_problem/zip_container', () => {
    const logFiles = ['/path/to/file1.txt', '/path/to/file2.txt'];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getFileSize).mockResolvedValue(1024);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders loading indicator when isLoading is true', () => {
        const {getByTestId, queryByText, queryByTestId} = render(
            <ZipContainer
                logFiles={logFiles}
                isLoading={true}
            />,
        );

        expect(getByTestId('logs-loading')).toBeTruthy();
        expect(queryByText('Logs')).toBeNull();
        expect(queryByText('ZIP')).toBeNull();
        expect(queryByTestId('zip-icon')).toBeNull();
    });

    it('renders zip container with log files when isLoading is false', () => {
        const {getByTestId, getByText, queryByTestId} = render(
            <ZipContainer
                logFiles={logFiles}
                isLoading={false}
            />,
        );

        expect(queryByTestId('logs-loading')).toBeNull();
        expect(getByText('Logs')).toBeTruthy();
        expect(getByText('ZIP')).toBeTruthy();
        expect(getByTestId('zip-icon')).toBeTruthy();
    });

    it('renders correct number of LogFileItem components', async () => {
        const {getAllByTestId} = render(
            <ZipContainer
                logFiles={logFiles}
                isLoading={false}
            />,
        );

        await waitFor(() => {
            // Each LogFileItem will have a log-file-icon testID as seen in log_file_item.test.tsx
            const logFileItems = getAllByTestId('log-file-icon');
            expect(logFileItems.length).toBe(logFiles.length);
        });
    });

    it('handles empty log files array', async () => {
        const {getByText, queryAllByTestId} = render(
            <ZipContainer
                logFiles={[]}
                isLoading={false}
            />,
        );

        expect(getByText('Logs')).toBeTruthy();
        expect(getByText('ZIP')).toBeTruthy();

        await waitFor(() => {
            // There should be no LogFileItem components
            const logFileItems = queryAllByTestId('log-file-icon');
            expect(logFileItems.length).toBe(0);
        });
    });

    it('renders correct icon for ZIP file', () => {
        const {getByTestId} = render(
            <ZipContainer
                logFiles={logFiles}
                isLoading={false}
            />,
        );

        const zipIcon = getByTestId('zip-icon');
        expect(zipIcon.props.name).toBe('file-zip-outline');
    });
});
