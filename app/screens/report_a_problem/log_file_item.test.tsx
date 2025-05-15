// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import React from 'react';

import LogFileItem from './log_file_item';

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    getFileSize: jest.fn(),
}));

describe('screens/report_a_problem/log_file_item', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders log file item with correct filename', async () => {
        const {getByText} = render(
            <LogFileItem/>,
        );

        await waitFor(() => {
            expect(getByText(/Logs_/)).toBeTruthy();
        });
    });

    it('displays file type', async () => {
        const {getByText} = render(
            <LogFileItem/>,
        );
        await waitFor(() => {
            expect(getByText('ZIP')).toBeTruthy();
        });
    });

    it('displays file icon', async () => {
        const {getByTestId} = render(
            <LogFileItem/>,
        );

        await waitFor(() => {
            const icon = getByTestId('log-file-icon');
            expect(icon.props.name).toBe('file-zip-outline-large');
        });
    });
});
