// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import ActionMenu from './action_menu';

describe('ActionMenu', () => {
    const baseProps = {
        postId: 'post1',
        id: 'action1',
        name: 'action',
        options: [
            {
                text: 'One',
                value: '1',
            },
            {
                text: 'Two',
                value: '2',
            },
        ],
        actions: {
            selectAttachmentMenuAction: jest.fn(),
        },
    };

    test('should start with nothing selected when no default is selected', () => {
        const wrapper = shallow(<ActionMenu {...baseProps}/>);

        expect(wrapper.state('selected')).toBeUndefined();
    });

    test('should set selected based on default option', () => {
        const props = {
            ...baseProps,
            defaultOption: '2',
        };
        const wrapper = shallow(<ActionMenu {...props}/>);

        expect(wrapper.state('selected')).toBe(props.options[1]);
    });

    test('should start with previous value selected', () => {
        const props = {
            ...baseProps,
            defaultOption: '2',
            selected: baseProps.options[0],
        };
        const wrapper = shallow(<ActionMenu {...props}/>);

        expect(wrapper.state('selected')).toBe(props.selected);
    });
});
