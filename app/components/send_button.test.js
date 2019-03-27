// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import SendButton from 'app/components/send_button';
import {changeOpacity} from 'app/utils/theme';

describe('SendButton', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        handleSendMessage: jest.fn(),
        disabled: false,
    };

    function getWrapper(props = {}) {
        return shallow(
            <SendButton
                {...baseProps}
                {...props}
            />
        );
    }

    test('should match snapshot', () => {
        const wrapper = getWrapper();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should render theme backgroundColor', () => {
        const wrapper = getWrapper();

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.childAt(0)).toHaveStyle('backgroundColor', baseProps.theme.buttonBg);
    });

    test('should change theme backgroundColor to 0.3 opacity', () => {
        const wrapper = getWrapper({disabled: true});

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.childAt(0)).toHaveStyle('backgroundColor', changeOpacity(baseProps.theme.buttonBg, 0.3));
    });
});
