// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {renderWithIntl} from '@test/intl-test-helper';

import DraftsButton from './drafts_button';

jest.mock('@actions/local/draft', () => ({
    switchToGlobalDrafts: jest.fn(),
}));
describe('Drafts Button', () => {
    it('should render the drafts button component', () => {
        const wrapper = renderWithIntl(
            <DraftsButton
                currentChannelId='channel_id'
                draftsCount={1}
            />,
        );

        const {getByText} = wrapper;
        expect(getByText('Drafts')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render the drafts button component with drafts count', () => {
        const wrapper = renderWithIntl(
            <DraftsButton
                currentChannelId='channel_id'
                draftsCount={23}
            />,
        );

        const {getByText} = wrapper;
        expect(getByText('Drafts')).toBeTruthy();
        expect(getByText('23')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('calls switchToGlobalDrafts when pressed', () => {
        const wrapper = renderWithIntl(
            <DraftsButton
                currentChannelId='channel-1'
                draftsCount={5}
            />,
        );
        const {getByTestId} = wrapper;
        fireEvent.press(getByTestId('channel_list.drafts.button'));
        expect(switchToGlobalDrafts).toHaveBeenCalledTimes(1);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('does not render if draftsCount is 0', () => {
        const wrapper = renderWithIntl(
            <DraftsButton
                currentChannelId='channel-1'
                draftsCount={0}
            />,
        );
        const {queryByTestId} = wrapper;
        expect(queryByTestId('channel_list.drafts.button')).toBeNull();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
