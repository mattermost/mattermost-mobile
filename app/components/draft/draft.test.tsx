// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Draft from './draft';

import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';

jest.mock('@components/formatted_text', () => jest.fn(() => null));
jest.mock('@components/formatted_time', () => jest.fn(() => null));
jest.mock('@components/compass_icon', () => jest.fn(() => null));

describe('Draft', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });
    it('should render the draft with channel info and draft message', () => {
        const props = {
            channel: {type: General.OPEN_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            location: 'channel',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
            } as unknown as DraftModel,
            layoutWidth: 100,
            isPostPriorityEnabled: false,
        };
        const wrapper = renderWithEverything(
            <Draft
                channel={props.channel}
                location={props.location}
                draft={props.draft}
                layoutWidth={props.layoutWidth}
                isPostPriorityEnabled={props.isPostPriorityEnabled}
            />
            , {database},
        );

        const {getByText} = wrapper;

        expect(FormattedText).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'channel_info.draft_in_channel',
                defaultMessage: 'In:',
            }),
            expect.anything(),
        );
        expect(CompassIcon).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'globe',
            }),
            expect.anything(),
        );
        expect(getByText('Hello, World!')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match the file count', () => {
        const props = {
            channel: {type: General.OPEN_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            location: 'channel',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [{
                    has_preview_image: false,
                    height: 0,
                    name: 'file1.txt',
                    extension: 'txt',
                    size: 64,
                }, {
                    has_preview_image: false,
                    height: 0,
                    name: 'file2.pdf',
                    extension: 'txt',
                    size: 64,
                }],
                metadata: {},
            } as unknown as DraftModel,
            layoutWidth: 100,
            isPostPriorityEnabled: false,
        };
        const wrapper = renderWithEverything(
            <Draft
                channel={props.channel}
                location={props.location}
                draft={props.draft}
                layoutWidth={props.layoutWidth}
                isPostPriorityEnabled={props.isPostPriorityEnabled}
            />
            , {database},
        );
        const {getAllByTestId} = wrapper;
        expect(getAllByTestId('file_attachment')).toHaveLength(2);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render the draft with channel info and draft message for a thread', () => {
        const props = {
            channel: {type: General.OPEN_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            location: 'thread',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: 'root_id',
                files: [],
                metadata: {},
            } as unknown as DraftModel,
            layoutWidth: 100,
            isPostPriorityEnabled: false,
        };
        const wrapper = renderWithEverything(
            <Draft
                channel={props.channel}
                location={props.location}
                draft={props.draft}
                layoutWidth={props.layoutWidth}
                isPostPriorityEnabled={props.isPostPriorityEnabled}
            />
            , {database},
        );

        const {getByText} = wrapper;
        expect(FormattedText).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'channel_info.thread_in',
                defaultMessage: 'Thread in:',
            }),
            expect.anything(),
        );

        expect(CompassIcon).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'globe',
            }),
            expect.anything(),
        );
        expect(getByText('Hello, World!')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render the draft with post priority', () => {
        const props = {
            channel: {type: General.OPEN_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            location: 'thread',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: 'root_id',
                files: [],
                metadata: {priority: {priority: 'important', requested_ack: false}},
            } as unknown as DraftModel,
            layoutWidth: 100,
            isPostPriorityEnabled: true,
        };
        const wrapper = renderWithEverything(
            <Draft
                channel={props.channel}
                location={props.location}
                draft={props.draft}
                layoutWidth={props.layoutWidth}
                isPostPriorityEnabled={props.isPostPriorityEnabled}
            />
            , {database},
        );
        const {getByText} = wrapper;
        expect(getByText('IMPORTANT')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
