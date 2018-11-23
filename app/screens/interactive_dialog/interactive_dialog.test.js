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
        },
        navigator: {
            setOnNavigatorEvent: jest.fn(),
            dismissModal: jest.fn(),
        },
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
        const submitInteractiveDialog = jest.fn();
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                actions={{submitInteractiveDialog}}
            />,
        );

        const dialog = {
            url: baseProps.url,
            callback_id: baseProps.callbackId,
            state: baseProps.state,
            submission: {name1: 'defaulttext'},
        };

        wrapper.instance().handleSubmit();
        expect(submitInteractiveDialog).toHaveBeenCalledTimes(1);
        expect(submitInteractiveDialog).toHaveBeenCalledWith(dialog);
    });

    test('should submit dialog on cancel', async () => {
        const submitInteractiveDialog = jest.fn();
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                actions={{submitInteractiveDialog}}
                notifyOnCancel={true}
            />,
        );

        const dialog = {
            url: baseProps.url,
            callback_id: baseProps.callbackId,
            state: baseProps.state,
            cancelled: true,
        };

        wrapper.instance().onNavigatorEvent({type: 'NavBarButtonPress', id: 'close-dialog'});
        expect(submitInteractiveDialog).toHaveBeenCalledTimes(1);
        expect(submitInteractiveDialog).toHaveBeenCalledWith(dialog);
    });

    test('should not submit dialog on cancel', async () => {
        const submitInteractiveDialog = jest.fn();
        const wrapper = shallow(
            <InteractiveDialog
                {...baseProps}
                actions={{submitInteractiveDialog}}
                notifyOnCancel={false}
            />,
        );

        wrapper.instance().onNavigatorEvent({type: 'NavBarButtonPress', id: 'close-dialog'});
        expect(submitInteractiveDialog).not.toHaveBeenCalled();
    });
});
