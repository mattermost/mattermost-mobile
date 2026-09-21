// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import BoRLabel from './index';

describe('BoRLabel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render with correct message and props', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel
                durationSeconds={300}
                id='test-post-id'
            />,
        );

        const tag = getByTestId('test-post-id_bor_label');
        expect(tag).toBeVisible();
        expect(tag).toHaveTextContent('BURN ON READ (5m)');
    });

    it('should render without postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={60}/>,
        );

        const tag = getByTestId('bor_label');
        expect(tag).toBeVisible();
        expect(tag).toHaveTextContent('BURN ON READ (1m)');
    });

    it('should format duration correctly for seconds', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel
                durationSeconds={30}
                id='test'
            />,
        );

        const tag = getByTestId('test_bor_label');
        expect(tag).toHaveTextContent('BURN ON READ (30s)');
    });

    it('should format duration correctly for hours', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel
                durationSeconds={7200}
                id='test'
            />,
        );

        const tag = getByTestId('test_bor_label');
        expect(tag).toHaveTextContent('BURN ON READ (2h)');
    });

    it('should generate correct testID with postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel
                durationSeconds={120}
                id='test-post'
            />,
        );

        expect(getByTestId('test-post_bor_label')).toBeVisible();
    });

    it('should generate correct testID without postId', () => {
        const {getByTestId} = renderWithIntl(
            <BoRLabel durationSeconds={120}/>,
        );

        expect(getByTestId('bor_label')).toBeVisible();
    });
});
