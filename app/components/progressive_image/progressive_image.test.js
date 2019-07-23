// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image} from 'react-native';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import ProgressiveImage from './progressive_image';

describe('ProgressiveImage', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ProgressiveImage {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should parse defaultSource uri', () => {
        const uri = 'HTTP://test-uri/ABC123';
        const expectedUri = 'http://test-uri/ABC123';

        const props = {
            ...baseProps,
            defaultSource: {uri},
        };
        const wrapper = shallow(
            <ProgressiveImage {...props}/>
        );

        const image = wrapper.find(Image);
        expect(image.props().source.uri).toBe(expectedUri);
    });
});