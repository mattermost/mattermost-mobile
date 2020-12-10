// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import {shallowWithIntl} from 'test/intl-test-helper';

import LongPost from './long_post';

jest.mock('react-native-file-viewer', () => ({
    open: jest.fn(),
}));

describe('LongPost', () => {
    const baseProps = {
        actions: {
            getPostThread: jest.fn(),
            selectPost: jest.fn(),
        },
        postId: 'post-id',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<LongPost {...baseProps}/>);

        expect(wrapper.instance()).toMatchSnapshot();
    });
});
