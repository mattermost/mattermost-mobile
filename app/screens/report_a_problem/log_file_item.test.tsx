// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, render, waitFor} from '@testing-library/react-native';
import React from 'react';

import {getFileSize} from '@utils/file';

import LogFileItem from './log_file_item';

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    getFileSize: jest.fn(),
}));

describe('screens/report_a_problem/log_file_item', () => {
    const filePath = '/path/to/log/file.txt';
    const fileSize = 1024; // 1KB

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getFileSize).mockResolvedValue(fileSize);
    });

    it('renders log file item with correct filename', async () => {
        const {getByText} = render(
            <LogFileItem path={filePath}/>,
        );

        await act(async () => {
            await waitFor(() => {
                expect(getByText('file.txt')).toBeTruthy();
            });
        });
    });

    it('displays file size in KB', async () => {
        const {getByText} = render(
            <LogFileItem path={filePath}/>,
        );

        await act(async () => {
            await waitFor(() => {
                expect(getByText('TXT 1024 B')).toBeTruthy();
            });
        });
    });

    it('handles file size calculation', async () => {
        render(
            <LogFileItem path={filePath}/>,
        );

        await act(async () => {
            await waitFor(() => {
                expect(getFileSize).toHaveBeenCalledWith(filePath);
            });
        });
    });

    it('rounds file size to nearest KB', async () => {
        jest.mocked(getFileSize).mockResolvedValue(2750); // 2.685KB

        const {getByText} = render(
            <LogFileItem path={filePath}/>,
        );

        await act(async () => {
            await waitFor(() => {
                expect(getByText('TXT 2 KB')).toBeTruthy();
            });
        });
    });

    it('displays file icon', async () => {
        const {getByTestId} = render(
            <LogFileItem path={filePath}/>,
        );

        await act(async () => {
            await waitFor(() => {
                const icon = getByTestId('log-file-icon');
                expect(icon.props.name).toBe('file-text-outline');
            });
        });
    });
});
