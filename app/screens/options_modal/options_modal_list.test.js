// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';

import OptionModalList from './options_modal_list';

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

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <OptionModalList {...baseProps}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
