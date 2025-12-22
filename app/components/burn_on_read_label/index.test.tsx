// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react-native';
import {IntlProvider} from 'react-intl';

import BoRLabel from './index';

// Mock the formatTime utility
jest.mock('@utils/datetime', () => ({
    formatTime: jest.fn((seconds: number, short: boolean) => {
        if (short) {
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
            return `${Math.floor(seconds / 3600)}h`;
        }
        return `${seconds} seconds`;
    }),
}));

describe('BoRLabel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render with correct message and props', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={300} postId="test-post-id" />
        );

        const tag = getByTestId('test-post-id_bor_tabel');
        expect(tag).toBeTruthy();
        expect(tag).toHaveTextContent(/BURN ON READ \(.+\)/);
    });

    it('should render without postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={60} />
        );

        const tag = getByTestId('bor_tabel');
        expect(tag).toBeTruthy();
        expect(tag).toHaveTextContent(/BURN ON READ \(.+\)/);
    });

    it('should format duration correctly for seconds', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={30} postId="test" />
        );

        const tag = getByTestId('test_bor_tabel');
        expect(tag).toHaveTextContent(/BURN ON READ \(.+\)/);
    });

    it('should format duration correctly for hours', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={7200} postId="test" />
        );

        const tag = getByTestId('test_bor_tabel');
        expect(tag).toHaveTextContent(/BURN ON READ \(.+\)/);
    });

    it('should generate correct testID with postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={120} postId="test-post" />
        );

        expect(getByTestId('test-post_bor_tabel')).toBeTruthy();
    });

    it('should generate correct testID without postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={120} />
        );

        expect(getByTestId('bor_tabel')).toBeTruthy();
    });
});
