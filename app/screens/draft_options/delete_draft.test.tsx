// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import DeleteDraft from './delete_draft';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

describe('DeleteDraft', () => {
    it('should render the component', () => {
        const wrapper = renderWithIntlAndTheme(
            <DeleteDraft
                bottomSheetId={Screens.DRAFT_OPTIONS}
                channelId='channel_id'
                rootId='root_id'
            />,
        );
        const {getByText, getByTestId} = wrapper;
        expect(getByText('Delete draft')).toBeTruthy();
        expect(getByTestId('trash-can-outline-icon')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('calls draftDeleteHandler when pressed', () => {
        const wrapper = renderWithIntlAndTheme(
            <DeleteDraft
                bottomSheetId={Screens.DRAFT_OPTIONS}
                channelId='channel_id'
                rootId='root_id'
            />,
        );
        const {getByTestId} = wrapper;
        fireEvent.press(getByTestId('trash-can-outline-icon'));
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
