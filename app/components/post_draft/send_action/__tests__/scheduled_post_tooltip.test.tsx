import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import ScheduledPostTooltip from '../scheduled_post_tooltip';
import {Preferences} from '@constants';
import {changeOpacity} from '@utils/theme';

describe('components/post_draft/send_action/ScheduledPostTooltip', () => {
    const baseProps = {
        onClose: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<ScheduledPostTooltip {...baseProps}/>);

        // Verify main container
        expect(screen.getByTestId('scheduled_post_tutorial_tooltip')).toBeTruthy();

        // Verify close button
        expect(screen.getByTestId('draft.tooltip.close.button')).toBeTruthy();

        // Verify description text
        const description = screen.getByTestId('draft.tooltip.description');
        expect(description).toBeTruthy();
        expect(description.props.children).toBe('Type a message and long press the send button to schedule it for a later time.');
    });

    it('calls onClose when close button is pressed', () => {
        render(<ScheduledPostTooltip {...baseProps}/>);

        const closeButton = screen.getByTestId('draft.tooltip.close.button');
        fireEvent.press(closeButton);

        expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('has correct styling', () => {
        const {getByTestId} = render(<ScheduledPostTooltip {...baseProps}/>);

        const container = getByTestId('scheduled_post_tutorial_tooltip');
        const description = getByTestId('draft.tooltip.description');

        // Check container styling
        expect(container.props.style).toEqual(expect.objectContaining({
            paddingHorizontal: 4,
            paddingVertical: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
        }));

        // Check description styling
        expect(description.props.style).toEqual(expect.objectContaining({
            color: Preferences.THEMES.denim.centerChannelColor,
            textAlign: 'center',
        }));
    });

    it('renders image with correct dimensions', () => {
        const {UNSAFE_getByType} = render(<ScheduledPostTooltip {...baseProps}/>);
        
        const image = UNSAFE_getByType('Image');
        expect(image.props.style).toEqual(expect.objectContaining({
            height: 69,
            width: 68,
        }));
    });

    it('renders close icon with correct properties', () => {
        const {UNSAFE_getByType} = render(<ScheduledPostTooltip {...baseProps}/>);
        
        const closeIcon = UNSAFE_getByType('CompassIcon');
        expect(closeIcon.props).toEqual(expect.objectContaining({
            color: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.56),
            name: 'close',
            size: 18,
        }));
    });

    it('has correct hit slop on close button', () => {
        const {getByTestId} = render(<ScheduledPostTooltip {...baseProps}/>);
        
        const closeButton = getByTestId('draft.tooltip.close.button');
        expect(closeButton.props.hitSlop).toEqual({
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
        });
    });
});
