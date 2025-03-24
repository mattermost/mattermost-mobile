// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {General, License, Screens} from '@constants';
import {bottomSheet} from '@screens/navigation';

import {ChannelBanner} from './channel_banner';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn(() => 50),
}));

describe('ChannelBanner', () => {
    const defaultProps = {
        channelType: General.OPEN_CHANNEL as ChannelType,
        bannerInfo: {
            enabled: true,
            text: 'Test Banner Text',
            background_color: '#FF0000',
        },
        license: {
            SkuShortName: License.SKU_SHORT_NAME.Enterprise,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with valid props', () => {
        render(<ChannelBanner {...defaultProps} />);
        
        expect(screen.getByText('Test Banner Text')).toBeTruthy();
    });

    it('does not render when license is missing', () => {
        const props = {
            ...defaultProps,
            license: undefined,
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render when banner info is missing', () => {
        const props = {
            ...defaultProps,
            bannerInfo: undefined,
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render when banner is not enabled', () => {
        const props = {
            ...defaultProps,
            bannerInfo: {
                ...defaultProps.bannerInfo,
                enabled: false,
            },
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render when banner text is missing', () => {
        const props = {
            ...defaultProps,
            bannerInfo: {
                ...defaultProps.bannerInfo,
                text: '',
            },
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render when banner background color is missing', () => {
        const props = {
            ...defaultProps,
            bannerInfo: {
                ...defaultProps.bannerInfo,
                background_color: '',
            },
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render for DM channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.DM_CHANNEL as ChannelType,
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render for GM channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.GM_CHANNEL as ChannelType,
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('renders for private channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.PRIVATE_CHANNEL as ChannelType,
        };
        
        render(<ChannelBanner {...props} />);
        
        expect(screen.getByText('Test Banner Text')).toBeTruthy();
    });

    it('does not render with non-enterprise license', () => {
        const props = {
            ...defaultProps,
            license: {
                SkuShortName: 'professional',
            },
        };
        
        const {queryByText} = render(<ChannelBanner {...props} />);
        
        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('opens bottom sheet when banner is pressed', () => {
        render(<ChannelBanner {...defaultProps} />);
        
        const banner = screen.getByText('Test Banner Text');
        fireEvent.press(banner);
        
        expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Channel Banner',
            closeButtonId: 'channel-banner-close',
        }));
    });

    it('applies correct background color to container', () => {
        const {UNSAFE_getByType} = render(<ChannelBanner {...defaultProps} />);
        
        // Find the TouchableOpacity's parent View
        const container = UNSAFE_getByType('View');
        
        expect(container.props.style).toEqual(
            expect.objectContaining({
                backgroundColor: '#FF0000',
            })
        );
    });

    it('limits banner text to one line with ellipsis', () => {
        render(<ChannelBanner {...defaultProps} />);
        
        const textComponent = screen.UNSAFE_getByType('Text');
        
        expect(textComponent.props.numberOfLines).toBe(1);
        expect(textComponent.props.ellipsizeMode).toBe('tail');
    });
});
