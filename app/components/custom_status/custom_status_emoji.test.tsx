// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';

import configureStore from 'test/test_store';
import {Provider} from 'react-redux';

import * as CustomStatusSelectors from '@selectors/custom_status';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import Emoji from '@components/emoji';
import {Store} from 'redux';

jest.mock('@selectors/custom_status');

describe('components/custom_status/custom_status_emoji', () => {
    let store : Store;
    beforeAll(async () => {
        store = await configureStore();
    });

    const getCustomStatus = () => {
        return {
            emoji: 'calendar',
            text: 'In a meeting',
        };
    };
    (CustomStatusSelectors.makeGetCustomStatus as jest.Mock).mockReturnValue(getCustomStatus);
    (CustomStatusSelectors.isCustomStatusEnabled as jest.Mock).mockReturnValue(true);
    it('should match snapshot', () => {
        const wrapper = shallow(
            <Provider store={store}>
                <CustomStatusEmoji/>
            </Provider>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should match snapshot with props', () => {
        const wrapper = shallow(
            <Provider store={store}>
                <CustomStatusEmoji
                    emojiSize={34}
                />
            </Provider>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should not render when EnableCustomStatus in config is false', () => {
        (CustomStatusSelectors.isCustomStatusEnabled as jest.Mock).mockReturnValue(false);
        const wrapper = shallow(
            <Provider store={store}>
                <CustomStatusEmoji/>
            </Provider>,
        );

        expect(wrapper.containsMatchingElement(<Emoji/>)).toBeFalsy();
    });

    it('should not render when getCustomStatus returns null', () => {
        (CustomStatusSelectors.isCustomStatusEnabled as jest.Mock).mockReturnValue(true);
        (CustomStatusSelectors.makeGetCustomStatus as jest.Mock).mockReturnValue(() => null);
        const wrapper = shallow(
            <Provider store={store}>
                <CustomStatusEmoji/>
            </Provider>,
        );

        expect(wrapper.containsMatchingElement(<Emoji/>)).toBeFalsy();
    });
});
