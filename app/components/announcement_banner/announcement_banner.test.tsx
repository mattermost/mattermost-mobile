// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {dismissAnnouncement} from '@actions/local/systems';
import {bottomSheet} from '@screens/navigation';

import Preferences from '@mm-redux/constants/preferences';

import AnnouncementBanner from './announcement_banner';

jest.mock('@actions/local/systems', () => ({
    dismissAnnouncement: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
    const View = require('react-native').View;
    
    return {
        useAnimatedStyle: jest.fn(() => ({})),
        useSharedValue: jest.fn(() => ({value: 0})),
        withTiming: jest.fn((value) => value),
        View,
    };
});

describe('AnnouncementBanner', () => {
    const baseProps = {
        bannerColor: '#f2a93b',
        bannerDismissed: false,
        bannerEnabled: true,
        bannerText: 'This is a test announcement',
        bannerTextColor: '#ffffff',
        allowDismissal: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when enabled and not dismissed', () => {
        const {getByText} = render(<AnnouncementBanner {...baseProps} />);
        
        expect(getByText('This is a test announcement')).toBeTruthy();
    });

    it('does not render when banner is disabled', () => {
        const props = {
            ...baseProps,
            bannerEnabled: false,
        };
        
        const {queryByText} = render(<AnnouncementBanner {...props} />);
        
        expect(queryByText('This is a test announcement')).toBeNull();
    });

    it('does not render when banner is dismissed', () => {
        const props = {
            ...baseProps,
            bannerDismissed: true,
        };
        
        const {queryByText} = render(<AnnouncementBanner {...props} />);
        
        expect(queryByText('This is a test announcement')).toBeNull();
    });

    it('does not render when banner text is empty', () => {
        const props = {
            ...baseProps,
            bannerText: '',
        };
        
        const {queryByText} = render(<AnnouncementBanner {...props} />);
        
        expect(queryByText('This is a test announcement')).toBeNull();
    });

    it('shows dismiss button when allowDismissal is true', () => {
        const {getByTestId} = render(
            <AnnouncementBanner 
                {...baseProps}
                allowDismissal={true}
            />
        );
        
        expect(getByTestId('announcement-dismiss-button')).toBeTruthy();
    });

    it('does not show dismiss button when allowDismissal is false', () => {
        const {queryByTestId} = render(
            <AnnouncementBanner 
                {...baseProps}
                allowDismissal={false}
            />
        );
        
        expect(queryByTestId('announcement-dismiss-button')).toBeNull();
    });

    it('calls dismissAnnouncement when dismiss button is pressed', () => {
        const {getByTestId} = render(<AnnouncementBanner {...baseProps} />);
        
        fireEvent.press(getByTestId('announcement-dismiss-button'));
        
        expect(dismissAnnouncement).toHaveBeenCalledWith(expect.any(String), baseProps.bannerText);
    });

    it('opens bottomSheet when banner is pressed', () => {
        const {getByTestId} = render(<AnnouncementBanner {...baseProps} />);
        
        fireEvent.press(getByTestId('announcement-banner-touchable'));
        
        expect(bottomSheet).toHaveBeenCalled();
        expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Announcement',
            closeButtonId: 'announcement-close',
        }));
    });
});
