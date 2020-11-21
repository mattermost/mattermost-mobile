// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import Theme from './theme';
import ThemeTile from './theme_tile';

jest.mock('react-intl');

const allowedThemes = Object.keys(Preferences.THEMES).map((key) => ({
    key,
    ...Preferences.THEMES[key],
}));

describe('Theme', () => {
    const baseProps = {
        actions: {
            savePreferences: jest.fn(),
        },
        allowedThemes,
        isTablet: false,
        teamId: 'test-team',
        theme: Preferences.THEMES.default,
        userId: 'test-user',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Theme {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(ThemeTile)).toHaveLength(4);
    });
});
