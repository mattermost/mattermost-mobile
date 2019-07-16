// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {Text} from 'react-native';

import Hashtag from './hashtag';

describe('Hashtag', () => {
    const baseProps = {
        hashtag: 'test',
        linkStyle: {color: 'red'},
        actions: {
            showSearchModal: jest.fn(),
            dismissAllModals: jest.fn(),
            popToRoot: jest.fn(),
        },
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<Hashtag {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should open hashtag search on click', () => {
        const props = {
            ...baseProps,
        };

        const wrapper = shallow(<Hashtag {...props}/>);

        wrapper.find(Text).simulate('press');

        expect(props.actions.dismissAllModals).toHaveBeenCalled();
        expect(props.actions.popToRoot).toHaveBeenCalled();
        expect(props.actions.showSearchModal).toHaveBeenCalledWith('#test');
    });

    test('should call onHashtagPress if provided', () => {
        const props = {
            ...baseProps,
            onHashtagPress: jest.fn(),
        };

        const wrapper = shallow(<Hashtag {...props}/>);

        wrapper.find(Text).simulate('press');

        expect(props.actions.dismissAllModals).not.toBeCalled();
        expect(props.actions.popToRoot).not.toBeCalled();
        expect(props.actions.showSearchModal).not.toBeCalled();

        expect(props.onHashtagPress).toBeCalled();
    });
});
