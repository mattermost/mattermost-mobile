// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {NativeEventEmitter} from 'react-native';
import {shallow} from 'enzyme';

import {PasteableTextInput} from './index';

const nativeEventEmitter = new NativeEventEmitter();

describe('PasteableTextInput', () => {
    test('should render pasteable text input', () => {
        const onPaste = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput onPaste={onPaste}>{text}</PasteableTextInput>
        );
        expect(component).toMatchSnapshot();
    });

    test('should call onPaste props if native onPaste trigger', () => {
        const onPaste = jest.fn();
        const event = {someData: 'data'};
        const text = 'My Text';
        shallow(
            <PasteableTextInput onPaste={onPaste}>{text}</PasteableTextInput>
        );
        nativeEventEmitter.emit('onPaste', event);
        expect(onPaste).toHaveBeenCalledWith(null, event);
    });

    test('should remove onPaste listener when unmount', () => {
        const mockRemove = jest.fn();
        const onPaste = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput onPaste={onPaste}>{text}</PasteableTextInput>
        );

        component.instance().subscription.remove = mockRemove;
        component.instance().componentWillUnmount();
        expect(mockRemove).toHaveBeenCalled();
    });
});
