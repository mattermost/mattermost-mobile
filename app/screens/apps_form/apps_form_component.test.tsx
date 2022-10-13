// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ShallowWrapper} from 'enzyme';
import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';

import AppsFormComponent, {Props, State} from './apps_form_component';

describe('AppsForm', () => {
    const baseProps: Props = {
        actions: {
            performLookupCall: jest.fn(),
            refreshOnSelect: jest.fn(),
            submit: jest.fn(),
            handleGotoLocation: jest.fn(),
        },
        componentId: '',
        form: {
            submit: {
                path: '/create',
            },
            title: 'Title',
            footer: 'Footer',
            header: 'Header',
            icon: 'Icon',
            submit_buttons: 'submit_buttons1',
            fields: [
                {
                    name: 'bool1',
                    type: 'bool',
                },
                {
                    name: 'bool2',
                    type: 'bool',
                    value: false,
                },
                {
                    name: 'bool3',
                    type: 'bool',
                    value: true,
                },
                {
                    name: 'text1',
                    type: 'text',
                    value: 'initial text',
                },
                {
                    name: 'select1',
                    type: 'static_select',
                    options: [
                        {label: 'Label1', value: 'Value1'},
                        {label: 'Label2', value: 'Value2'},
                    ],
                    value: {label: 'Label1', value: 'Value1'},
                },
                {
                    name: 'submit_buttons1',
                    type: 'static_select',
                    options: [
                        {label: 'Label3', value: 'Value3'},
                        {label: 'Label4', value: 'Value4'},
                    ],
                    value: null,
                },

            ],
        },
        theme: Preferences.THEMES.denim,
    };

    test('should set match snapshot', () => {
        const wrapper: ShallowWrapper<Props, State, typeof AppsFormComponent> = shallowWithIntl(
            <AppsFormComponent
                {...baseProps}
            />,
        ) as unknown as ShallowWrapper<Props, State, typeof AppsFormComponent>;

        expect(wrapper).toMatchSnapshot();
    });

    test('should set initial form values', () => {
        const wrapper: ShallowWrapper<Props, State, typeof AppsFormComponent> = shallowWithIntl(
            <AppsFormComponent
                {...baseProps}
            />,
        ) as unknown as ShallowWrapper<Props, State, typeof AppsFormComponent>;

        expect(wrapper.state().values).toEqual({
            bool1: false,
            bool2: false,
            bool3: true,
            text1: 'initial text',
            select1: {label: 'Label1', value: 'Value1'},
            submit_buttons1: null,
        });
    });

    test('it should submit and close the modal', async () => {
        const submit = jest.fn().mockResolvedValue({data: {type: 'ok'}});

        const props: Props = {
            ...baseProps,
            actions: {
                ...baseProps.actions,
                submit,
            },
        };

        const wrapper: ShallowWrapper<Props, State, typeof AppsFormComponent> = shallowWithIntl(
            <AppsFormComponent
                {...props}
            />,
        ) as unknown as ShallowWrapper<Props, State, typeof AppsFormComponent>;

        const hide = jest.fn();

        // @ts-expect-error handleHide is defined
        wrapper.instance().handleHide = hide;

        // @ts-expect-error doSubmit is defined
        await wrapper.instance().doSubmit();

        expect(submit).toHaveBeenCalledWith({
            values: {
                bool1: false,
                bool2: false,
                bool3: true,
                text1: 'initial text',
                select1: {label: 'Label1', value: 'Value1'},
                submit_buttons1: null,
            },
        });
        expect(hide).toHaveBeenCalled();
    });
});
