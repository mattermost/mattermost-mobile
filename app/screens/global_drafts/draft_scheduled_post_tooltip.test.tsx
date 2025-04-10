// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '../../constants/draft';

import DraftScheduledPostTooltip from './draft_scheduled_post_tooltip';

describe('DraftScheduledPostTooltip', () => {
    const baseProps: Parameters<typeof DraftScheduledPostTooltip>[0] = {
        onClose: jest.fn(),
        draftType: DRAFT_TYPE_DRAFT,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render correct text for draft type', () => {
        const {getByTestId, getByText} = renderWithIntl(
            <DraftScheduledPostTooltip
                {...baseProps}
            />,
        );

        expect(getByTestId('draft.tooltip.description')).toBeTruthy();
        expect(getByText('Long-press on an item to see draft actions')).toBeTruthy();
    });

    it('should render correct text for scheduled post type', () => {
        const props: Parameters<typeof DraftScheduledPostTooltip>[0] = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
        };

        const {getByTestId, getByText} = renderWithIntl(
            <DraftScheduledPostTooltip
                {...props}
            />,
        );

        expect(getByTestId('scheduled_post.tooltip.description')).toBeTruthy();
        expect(getByText('Long-press on an item to see scheduled post actions')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', async () => {
        const {getByTestId} = renderWithIntl(
            <DraftScheduledPostTooltip
                {...baseProps}
            />,
        );

        await act(() => fireEvent.press(getByTestId('draft.tooltip.close.button')));
        expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });
});
