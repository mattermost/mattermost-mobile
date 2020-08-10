// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {NativeEventEmitter} from 'react-native';
import {shallow} from 'enzyme';

import {PASTE_FILES} from '@constants/post_draft';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {PasteableTextInput} from './index';

const nativeEventEmitter = new NativeEventEmitter();

describe('PasteableTextInput', () => {
    test('should render pasteable text input', () => {
        const onPaste = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput onPaste={onPaste}>{text}</PasteableTextInput>,
        );
        expect(component).toMatchSnapshot();
    });

    test('should call onPaste props if native onPaste trigger', () => {
        const event = {someData: 'data'};
        const text = 'My Text';
        const onPaste = jest.spyOn(EventEmitter, 'emit');
        shallow(
            <PasteableTextInput>{text}</PasteableTextInput>,
        );
        nativeEventEmitter.emit('onPaste', event);
        expect(onPaste).toHaveBeenCalledWith(PASTE_FILES, null, event);
    });

    test('should remove onPaste listener when unmount', () => {
        const mockRemove = jest.fn();
        const text = 'My Text';
        const component = shallow(
            <PasteableTextInput>{text}</PasteableTextInput>,
        );

        component.instance().subscription.remove = mockRemove;
        component.instance().componentWillUnmount();
        expect(mockRemove).toHaveBeenCalled();
    });
});
