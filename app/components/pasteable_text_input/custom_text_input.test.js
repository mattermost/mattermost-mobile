// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import renderer from 'react-test-renderer';

import CustomTextInput from './custom_text_input';

describe('CustomTextInput', () => {
    test('should render custom text input', () => {
        const onPaste = jest.fn();
        const text = 'My Text';
        const component = renderer.create(
            <CustomTextInput onPaste={onPaste}>{text}</CustomTextInput>
        );
        expect(component.toJSON()).toMatchSnapshot();
    });
});
