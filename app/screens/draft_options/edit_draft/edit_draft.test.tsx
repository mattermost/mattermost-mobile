// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditDraft from '.';

import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

describe('Edit Draft', () => {
    it('Should render the Edit draft component', () => {
        const props = {
            bottomSheetId: Screens.DRAFT_OPTIONS,
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as ChannelModel,
            rootId: 'root_id',
        };
        const wrapper = renderWithIntlAndTheme(
            <EditDraft {...props}/>,
        );
        const {getByTestId, getByText} = wrapper;
        expect(getByTestId('pencil-outline-icon')).toBeTruthy();
        expect(getByText('Edit draft')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('Should call editHandler when pressed', () => {
        const props = {
            bottomSheetId: Screens.DRAFT_OPTIONS,
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as ChannelModel,
            rootId: 'root_id',
        };
        const wrapper = renderWithIntlAndTheme(
            <EditDraft {...props}/>,
        );
        const {getByTestId} = wrapper;
        fireEvent.press(getByTestId('pencil-outline-icon'));
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
