// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {renderWithIntl} from '@test/intl-test-helper';
import {metadataToString} from '@utils/share_logs';
import {showSnackBar} from '@utils/snack_bar';

import CopyMetadata from './copy_metadata';

jest.mock('@react-native-clipboard/clipboard', () => ({
    setString: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

describe('screens/report_a_problem/copy_metadata', () => {
    const metadata = {
        currentUserId: 'user1',
        currentTeamId: 'team1',
        serverVersion: '7.8.0',
        appVersion: '2.0.0',
        appPlatform: 'ios',
    };
    const componentId = 'ReportProblem';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all metadata fields', () => {
        const {getByText} = renderWithIntl(
            <CopyMetadata
                metadata={metadata}
                componentId={componentId}
            />,
        );

        // Check title
        expect(getByText('METADATA:')).toBeTruthy();

        // Check each metadata field is displayed
        expect(getByText('Current User ID: user1')).toBeTruthy();
        expect(getByText('Current Team ID: team1')).toBeTruthy();
        expect(getByText('Server Version: 7.8.0')).toBeTruthy();
        expect(getByText('App Version: 2.0.0')).toBeTruthy();
        expect(getByText('App Platform: ios')).toBeTruthy();
    });

    it('copies metadata to clipboard when copy button is pressed', () => {
        const {getByText} = renderWithIntl(
            <CopyMetadata
                metadata={metadata}
                componentId={componentId}
            />,
        );

        const copyButton = getByText('Copy');
        fireEvent.press(copyButton);

        expect(Clipboard.setString).toHaveBeenCalledWith(
            metadataToString(metadata),
        );
        expect(showSnackBar).toHaveBeenCalledWith({
            barType: SNACK_BAR_TYPE.INFO_COPIED,
            sourceScreen: componentId,
        });
    });

    it('handles empty metadata', () => {
        const emptyMetadata = {
            currentUserId: '',
            currentTeamId: '',
            serverVersion: '',
            appVersion: '',
            appPlatform: '',
        };

        const {getByText} = renderWithIntl(
            <CopyMetadata
                metadata={emptyMetadata}
                componentId={componentId}
            />,
        );

        // Check that empty values are displayed correctly
        expect(getByText('Current User ID: ')).toBeTruthy();
        expect(getByText('Current Team ID: ')).toBeTruthy();
        expect(getByText('Server Version: ')).toBeTruthy();
        expect(getByText('App Version: ')).toBeTruthy();
        expect(getByText('App Platform: ')).toBeTruthy();

        const copyButton = getByText('Copy');
        fireEvent.press(copyButton);

        expect(Clipboard.setString).toHaveBeenCalledWith(
            metadataToString(emptyMetadata),
        );
        expect(showSnackBar).toHaveBeenCalledWith({
            barType: SNACK_BAR_TYPE.INFO_COPIED,
            sourceScreen: componentId,
        });
    });
});
