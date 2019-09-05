// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';
import RadioSetting from 'app/components/widgets/settings/radio_setting';
import DialogElement from './dialog_element.js';

describe('DialogElement', () => {
    const baseDialogProps = {
        displayName: 'Testing',
        name: 'testing',
        type: 'text',
    };

    const theme = Preferences.THEMES.default;
    test('secureTextEntry is true and multiline is false when subtype is password', () => {
        const wrapper = shallow(
            <DialogElement
                {...baseDialogProps}
                theme={theme}
                subtype='password'
            />
        );
        expect(wrapper.find({secureTextEntry: true}).exists()).toBe(true);
        expect(wrapper.find({multiline: false}).exists()).toBe(true);
    });
    test('secureTextEntry is false when subtype is not password', () => {
        const wrapper = shallow(
            <DialogElement
                {...baseDialogProps}
                theme={theme}
                subtype='email'
            />
        );
        expect(wrapper.find({secureTextEntry: false}).exists()).toBe(true);
    });

    describe('radioSetting', () => {
        const radioOptions = [
            {value: 'foo', text: 'foo-text'},
            {value: 'bar', text: 'bar-text'},
        ];

        test('RadioSetting is rendered when type is radio', () => {
            const wrapper = shallow(
                <DialogElement
                    {...baseDialogProps}
                    theme={theme}
                    type='radio'
                    options={radioOptions}
                />
            );

            expect(wrapper.find(RadioSetting).exists()).toBe(true);
        });

        test('The default value is the first element of the list', () => {
            const wrapper = shallow(
                <DialogElement
                    {...baseDialogProps}
                    theme={theme}
                    type='radio'
                    options={radioOptions}
                />
            );
            expect(wrapper.find({options: radioOptions, value: radioOptions[0].value}).exists()).toBe(true);
        });

        test('The default value can be specified from the list', () => {
            const wrapper = shallow(
                <DialogElement
                    {...baseDialogProps}
                    theme={theme}
                    type='radio'
                    options={radioOptions}
                    value={radioOptions[1].value}
                />
            );
            expect(wrapper.find({options: radioOptions, value: radioOptions[1].value}).exists()).toBe(true);
        });
    });
});
