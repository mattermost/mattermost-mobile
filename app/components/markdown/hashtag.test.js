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
        navigator: {},
        theme: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<Hashtag {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should open hashtag search on click', () => {
        const props = {
            ...baseProps,
            navigator: {
                dismissAllModals: jest.fn(),
                popToRoot: jest.fn(),
                showModal: jest.fn(),
            },
        };

        const wrapper = shallow(<Hashtag {...props}/>);

        wrapper.find(Text).simulate('press');

        expect(props.navigator.dismissAllModals).toHaveBeenCalled();
        expect(props.navigator.popToRoot).toHaveBeenCalled();
        expect(props.navigator.showModal).toHaveBeenCalledWith(expect.objectContaining({
            screen: 'Search',
            passProps: {
                initialValue: '#test',
            },
        }));
    });

    test('should call onHashtagPress if provided', () => {
        const props = {
            ...baseProps,
            navigator: {
                dismissAllModals: jest.fn(),
                popToRoot: jest.fn(),
                showModal: jest.fn(),
            },
            onHashtagPress: jest.fn(),
        };

        const wrapper = shallow(<Hashtag {...props}/>);

        wrapper.find(Text).simulate('press');

        expect(props.navigator.dismissAllModals).not.toBeCalled();
        expect(props.navigator.popToRoot).not.toBeCalled();
        expect(props.navigator.showModal).not.toBeCalled();

        expect(props.onHashtagPress).toBeCalled();
    });
});
