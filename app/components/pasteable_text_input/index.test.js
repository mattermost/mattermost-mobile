// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import {PasteableTextInput} from './index';

describe('PasteableTextInput', () => {
    test('should render pasteable text input', () => {
        const onPaste = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput
                onPaste={onPaste}
                screenId='Channel'
            >{text}</PasteableTextInput>,
        );
        expect(component).toMatchSnapshot();
    });

    test('should remove onPaste listener when unmount', () => {
        const mockRemove = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput screenId='Channel'>{text}</PasteableTextInput>,
        );

        component.instance().subscription.remove = mockRemove;
        component.instance().componentWillUnmount();
        expect(mockRemove).toHaveBeenCalled();
    });
});
