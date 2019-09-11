// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import InteractiveDialog from './interactive_dialog';

describe('InteractiveDialog', () => {
    const baseProps = {
        url: 'http://mattermost.com',
        callbackId: 'someid',
        elements: [
            {type: 'text', name: 'name1', default: 'defaulttext', display_name: 'Name1'},
        ],
        notifyOnCancel: false,
        state: 'somestate',
        theme: Preferences.THEMES.default,
        actions: {
            submitInteractiveDialog: jest.fn(),
            dismissModal: jest.fn(),
        },
        componentId: 'component-id',
    };

    test('should set default values', async () => {
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
            />,
        );

        expect(wrapper.state().values.name1).toBe('defaulttext');
    });

    test('should submit dialog', async () => {
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
            />,
        );

        const dialog = {
            url: baseProps.url,
            callback_id: baseProps.callbackId,
            state: baseProps.state,
            submission: {name1: 'defaulttext'},
        };

        wrapper.instance().handleSubmit();
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledWith(dialog);
    });

    test('should submit dialog on cancel', async () => {
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                notifyOnCancel={true}
            />,
        );

        const dialog = {
            url: baseProps.url,
            callback_id: baseProps.callbackId,
            state: baseProps.state,
            cancelled: true,
        };

        wrapper.instance().navigationButtonPressed({buttonId: 'close-dialog'});
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledWith(dialog);
    });

    test('should not submit dialog on cancel', async () => {
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                notifyOnCancel={false}
            />,
        );

        wrapper.instance().navigationButtonPressed({buttonId: 'close-dialog'});
        expect(baseProps.actions.submitInteractiveDialog).not.toHaveBeenCalled();
    });

    test('should handle display with no elements', async () => {
        baseProps.elements = null;

        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                notifyOnCancel={false}
            />,
        );

        const dialog = {
            url: baseProps.url,
            callback_id: baseProps.callbackId,
            state: baseProps.state,
            submission: {},
        };

        wrapper.instance().handleSubmit();
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.submitInteractiveDialog).toHaveBeenCalledWith(dialog);
    });
});
