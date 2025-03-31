// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {General, License} from '@constants';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelBanner from './index';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn(() => 50),
}));

describe('ChannelBanner', () => {
    const defaultProps = {
        channelId: 'channel-id',
    };

    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        
        // Set up mock data for the channel
        await TestHelper.basicClient4.createChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        // Set up mock license data
        await TestHelper.basicClient4.saveLicense({
            SkuShortName: License.SKU_SHORT_NAME.Enterprise,
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with valid props', () => {
        renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(screen.getByText('Test Banner Text')).toBeVisible();
    });

    it('does not render when license is missing', async () => {
        // Clear license data
        await TestHelper.basicClient4.removeLicense();
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore license for other tests
        await TestHelper.basicClient4.saveLicense({
            SkuShortName: License.SKU_SHORT_NAME.Enterprise,
        });
    });

    it('does not render when license is professional', async () => {
        // Change license to Professional
        await TestHelper.basicClient4.saveLicense({
            SkuShortName: License.SKU_SHORT_NAME.Professional,
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore license for other tests
        await TestHelper.basicClient4.saveLicense({
            SkuShortName: License.SKU_SHORT_NAME.Enterprise,
        });
    });

    // it('does not render when license is Enterprise', () => {
    //     // TODO: update this test when Premium SKU is added
    //     const props = {
    //         ...defaultProps,
    //         license: {
    //             SkuShortName: License.SKU_SHORT_NAME.Enterprise,
    //         } as ClientLicense,
    //     };
    //
    //     const {queryByText} = renderWithEverything(
    //         <ChannelBanner {...props}/>,
    //         {database},
    //     );
    //
    //     expect(queryByText('Test Banner Text')).toBeNull();
    // });

    it('does not render when banner info is missing', async () => {
        // Update channel to remove banner info
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: undefined,
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore banner info for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('does not render when banner is not enabled', async () => {
        // Update channel to disable banner
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: false,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore banner for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('does not render when banner text is missing', async () => {
        // Update channel to remove banner text
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: '',
                background_color: '#FF0000',
            },
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore banner text for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('does not render when banner background color is missing', async () => {
        // Update channel to remove background color
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '',
            },
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore background color for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('does not render for DM channel type', async () => {
        // Update channel to DM type
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.DM_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore channel type for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('does not render for GM channel type', async () => {
        // Update channel to GM type
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.GM_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        const {queryByText} = renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
        
        // Restore channel type for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('renders for private channel type', async () => {
        // Update channel to private type
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.PRIVATE_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        expect(screen.getByText('Test Banner Text')).toBeVisible();
        
        // Restore channel type for other tests
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
    });

    it('opens bottom sheet when banner is pressed', async () => {
        // Ensure we have the right channel setup
        await TestHelper.basicClient4.updateChannel({
            id: 'channel-id',
            type: General.OPEN_CHANNEL,
            banner_info: {
                enabled: true,
                text: 'Test Banner Text',
                background_color: '#FF0000',
            },
        });
        
        renderWithEverything(
            <ChannelBanner {...defaultProps}/>,
            {database},
        );

        const banner = screen.getByText('Test Banner Text');
        fireEvent.press(banner);

        expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Channel Banner',
            closeButtonId: 'channel-banner-close',
        }));
    });
});
