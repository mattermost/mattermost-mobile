// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {General, License} from '@constants';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {ChannelBanner} from './channel_banner';

import type Database from '@nozbe/watermelondb/Database';

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
        } as ClientLicense,
    };

    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
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

    it('does not render when license is missing', () => {
        const props = {
            ...defaultProps,
            license: undefined,
        };

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render when license is professional', () => {
        const props = {
            ...defaultProps,
            license: {
                SkuShortName: License.SKU_SHORT_NAME.Professional,
            } as ClientLicense,
        };

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
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

    it('does not render when banner info is missing', () => {
        const props = {
            ...defaultProps,
            bannerInfo: undefined,
        };

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

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

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

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

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

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

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render for DM channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.DM_CHANNEL as ChannelType,
        };

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('does not render for GM channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.GM_CHANNEL as ChannelType,
        };

        const {queryByText} = renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).toBeNull();
    });

    it('renders for private channel type', () => {
        const props = {
            ...defaultProps,
            channelType: General.PRIVATE_CHANNEL as ChannelType,
        };

        renderWithEverything(
            <ChannelBanner {...props}/>,
            {database},
        );

        expect(screen.getByText('Test Banner Text')).toBeVisible();
    });

    it('opens bottom sheet when banner is pressed', () => {
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
