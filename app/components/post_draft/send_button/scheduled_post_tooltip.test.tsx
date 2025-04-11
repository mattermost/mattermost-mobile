// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import ScheduledPostTooltip from '@components/post_draft/send_button/scheduled_post_tooltip';
import {renderWithIntl} from '@test/intl-test-helper';

describe('components/post_draft/send_button/ScheduledPostTooltip', () => {
    const baseProps = {
        onClose: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        renderWithIntl(<ScheduledPostTooltip {...baseProps}/>);

        // Verify main container
        expect(screen.getByTestId('scheduled_post_tutorial_tooltip')).toBeVisible();

        // Verify close button
        expect(screen.getByTestId('scheduled_post.tooltip.close.button')).toBeVisible();

        // Verify description text
        const description = screen.getByTestId('scheduled_post.tooltip.description');
        expect(description).toBeVisible();
        expect(description.props.children).toBe('Type a message and long press the send button to schedule it for a later time.');
    });

    it('calls onClose when close button is pressed', () => {
        renderWithIntl(<ScheduledPostTooltip {...baseProps}/>);

        const closeButton = screen.getByTestId('scheduled_post.tooltip.close.button');
        fireEvent.press(closeButton);

        expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });
});
