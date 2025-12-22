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

const renderWithIntl = (component: React.ReactElement) => {
    return render(
        <IntlProvider locale="en" messages={{}}>
            {component}
        </IntlProvider>
    );
};

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
        expect(tag).toHaveTextContent('BURN ON READ (5m)');
    });

    it('should render without postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={60} />
        );

        const tag = getByTestId('bor_tabel');
        expect(tag).toBeTruthy();
        expect(tag).toHaveTextContent('BURN ON READ (1m)');
    });

    it('should format duration correctly for seconds', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={30} postId="test" />
        );

        const tag = getByTestId('test_bor_tabel');
        expect(tag).toHaveTextContent('BURN ON READ (30s)');
    });

    it('should format duration correctly for hours', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={7200} postId="test" />
        );

        const tag = getByTestId('test_bor_tabel');
        expect(tag).toHaveTextContent('BURN ON READ (2h)');
    });

    it('should call formatTime with correct parameters', () => {
        const formatTimeMock = require('@utils/datetime').formatTime;
        
        renderWithIntl(
            <BoRLabel durationSeconds={120} postId="test-post" />
        );

        expect(formatTimeMock).toHaveBeenCalledWith(120, true);
    });
});
