// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionModalListAndroid from './options_modal_list.android';
import OptionModalListIOS from './options_modal_list.ios';
import {renderWithIntl} from '@test/intl-test-helper';

describe('OptionModalList', () => {
    const baseProps = {
        items: [{
            action: jest.fn(),
            text: {
                id: 'mobile.file_upload.camera',
                defaultMessage: 'Take Photo or Video',
            },
            icon: 'camera',
        }, {
            action: jest.fn(),
            text: {
                id: 'mobile.file_upload.library',
                defaultMessage: 'Photo Library',
            },
            icon: 'photo',
        }],
        onCancelPress: jest.fn(),
        title: 'test',
    };

    test('should match snapshot for iOS', async () => {
        const wrapper = renderWithIntl(
            <OptionModalListIOS {...baseProps}/>,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    test('should match snapshot for Android', async () => {
        const wrapper = renderWithIntl(
            <OptionModalListAndroid {...baseProps}/>,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
