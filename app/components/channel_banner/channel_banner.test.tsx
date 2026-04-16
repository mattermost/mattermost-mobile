// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {General, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelBanner from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn(() => 50),
}));

describe('ChannelBanner', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const serverUrl = 'baseHandler.test.com';
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        const channel = await getChannelById(database, TestHelper.basicChannel!.id);
        await database.write(async () => {
            await channel?.update(() => {
                channel.bannerInfo = {
                    enabled: true,
                    text: 'Test Banner Text',
                    background_color: '#FF0000',
                };
            });
        });

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}], prepareRecordsOnly: false});
    });

    it('renders correctly with valid props', () => {
        renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        expect(screen.getByText('Test Banner Text')).toBeVisible();
    });

    it('does not render when banner info is missing', async () => {
        const channel = await getChannelById(database, TestHelper.basicChannel!.id);
        await database.write(async () => {
            await channel?.update(() => {
                channel.bannerInfo = undefined;
            });
        });

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render when banner is not enabled', async () => {
        const channel = await getChannelById(database, TestHelper.basicChannel!.id);
        await database.write(async () => {
            await channel?.update(() => {
                channel.bannerInfo = {
                    enabled: false,
                    text: 'Test Banner Text',
                    background_color: '#FF0000',
                };
            });
        });

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render when banner text is missing', async () => {
        const channel = await getChannelById(database, TestHelper.basicChannel!.id);
        await database.write(async () => {
            await channel?.update(() => {
                channel.bannerInfo = {
                    enabled: false,
                    text: undefined,
                    background_color: '#FF0000',
                };
            });
        });

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render when banner background color is missing', async () => {
        const channel = await getChannelById(database, TestHelper.basicChannel!.id);
        await database.write(async () => {
            await channel?.update(() => {
                channel.bannerInfo = {
                    enabled: false,
                    text: 'Banner text',
                    background_color: undefined,
                };
            });
        });

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render for DM channel type', async () => {
        const dmChannel = TestHelper.fakeDmChannel(TestHelper.basicUser!.id, TestHelper.basicUser!.id) as Channel;
        await operator.handleChannel({channels: [dmChannel], prepareRecordsOnly: false});

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={dmChannel!.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render for GM channel type', async () => {
        const gmChannel = TestHelper.fakeChannelWithId('');
        gmChannel.type = General.GM_CHANNEL;
        await operator.handleChannel({channels: [gmChannel], prepareRecordsOnly: false});

        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId={gmChannel.id}/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('renders for private channel type', async () => {
        const privateChannel = TestHelper.fakeChannelWithId(TestHelper.basicTeam!.id);
        privateChannel.type = General.PRIVATE_CHANNEL;
        privateChannel.banner_info = {
            enabled: true,
            text: 'Test Banner Text',
            background_color: '#FF0000',
        };
        await operator.handleChannel({channels: [privateChannel], prepareRecordsOnly: false});

        renderWithEverything(
            <ChannelBanner channelId={privateChannel.id}/>,
            {database},
        );

        expect(screen.getByText('Test Banner Text')).toBeVisible();
    });

    it('opens bottom sheet when banner is pressed', async () => {
        renderWithEverything(
            <ChannelBanner channelId={TestHelper.basicChannel!.id}/>,
            {database},
        );

        const banner = screen.getByText('Test Banner Text');
        fireEvent.press(banner);

        expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Channel Banner',
            closeButtonId: 'channel-banner-close',
        }));
    });

    it('does not render when channel ID is empty', async () => {
        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId=''/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });

    it('does not render when channel ID is of non existent channel', async () => {
        const {queryByText} = renderWithEverything(
            <ChannelBanner channelId='non_existent_channel_id'/>,
            {database},
        );

        expect(queryByText('Test Banner Text')).not.toBeVisible();
    });
});
