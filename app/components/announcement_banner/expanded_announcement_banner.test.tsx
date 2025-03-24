// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

import {dismissAnnouncement} from '@actions/local/systems';
import {dismissBottomSheet} from '@screens/navigation';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

jest.mock('@actions/local/systems', () => ({
    dismissAnnouncement: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@hooks/bottom_sheet_lists_fix', () => ({
    useBottomSheetListsFix: jest.fn(() => ({
        enabled: true,
        panResponder: {
            panHandlers: {},
        },
    })),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));

describe('ExpandedAnnouncementBanner', () => {
    const baseProps = {
        allowDismissal: true,
        bannerText: 'This is a test announcement with **markdown**',
        headingText: 'Test Announcement',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with provided props', () => {
        const {getByText} = render(<ExpandedAnnouncementBanner {...baseProps} />);
        
        expect(getByText('Test Announcement')).toBeTruthy();
        expect(getByText('Okay')).toBeTruthy();
        expect(getByText('Dismiss announcement')).toBeTruthy();
    });

    it('renders with default heading when headingText is not provided', () => {
        const props = {
            ...baseProps,
            headingText: undefined,
        };
        
        const {getByText} = render(<ExpandedAnnouncementBanner {...props} />);
        
        expect(getByText('Announcement')).toBeTruthy();
    });

    it('does not show dismiss button when allowDismissal is false', () => {
        const props = {
            ...baseProps,
            allowDismissal: false,
        };
        
        const {queryByText} = render(<ExpandedAnnouncementBanner {...props} />);
        
        expect(queryByText('Dismiss announcement')).toBeNull();
    });

    it('calls dismissBottomSheet when Okay button is pressed', () => {
        const {getByText} = render(<ExpandedAnnouncementBanner {...baseProps} />);
        
        fireEvent.press(getByText('Okay'));
        
        expect(dismissBottomSheet).toHaveBeenCalled();
    });

    it('calls dismissAnnouncement and dismissBottomSheet when Dismiss button is pressed', () => {
        const {getByText} = render(<ExpandedAnnouncementBanner {...baseProps} />);
        
        fireEvent.press(getByText('Dismiss announcement'));
        
        expect(dismissAnnouncement).toHaveBeenCalledWith(expect.any(String), baseProps.bannerText);
        expect(dismissBottomSheet).toHaveBeenCalled();
    });
});
