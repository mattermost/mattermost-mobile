// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import {Preferences} from '@mm-redux/constants';
import UploadRemove from './upload_remove';

describe('UploadRemove', () => {
    const props = {
        onPress: jest.fn(),
        channelId: 'channel-id',
        clientId: 'client-id',
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallowWithIntl(
            <UploadRemove {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
