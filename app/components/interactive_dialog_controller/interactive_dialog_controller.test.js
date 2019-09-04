// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import InteractiveDialogController from './interactive_dialog_controller';

jest.mock('react-intl');
jest.mock('react-native-vector-icons/MaterialIcons', () => ({
    getImageSource: jest.fn().mockResolvedValue({}),
}));

describe('InteractiveDialogController', () => {
    test('should open interactive dialog as alert or screen depending on with or without element', () => {
        let baseProps = getBaseProps('trigger_id_1');
        const wrapper = shallow(
            <InteractiveDialogController {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const instance = wrapper.instance();
        instance.showAlertDialog = jest.fn();
        instance.showInteractiveDialogScreen = jest.fn();

        expect(instance.showAlertDialog).toHaveBeenCalledTimes(0);
        expect(instance.showInteractiveDialogScreen).toHaveBeenCalledTimes(0);

        baseProps = getBaseProps('trigger_id_2');
        wrapper.setProps({...baseProps});
        expect(instance.showAlertDialog).toHaveBeenCalledTimes(1);
        expect(instance.showAlertDialog).toHaveBeenCalledWith(baseProps.dialogData.dialog, baseProps.dialogData.url);
        expect(instance.showInteractiveDialogScreen).toHaveBeenCalledTimes(0);

        const elements = [{
            data_source: '',
            default: '',
            display_name: 'Number',
            help_text: '',
            max_length: 0,
            min_length: 0,
            name: 'somenumber',
            optional: false,
            options: null,
            placeholder: '',
            subtype: 'number',
            type: 'text',
        }];

        baseProps = getBaseProps('trigger_id_3', elements);
        wrapper.setProps({...baseProps});
        expect(instance.showAlertDialog).toHaveBeenCalledTimes(1);
        expect(instance.showInteractiveDialogScreen).toHaveBeenCalledTimes(1);
        expect(instance.showInteractiveDialogScreen).toHaveBeenCalledWith(baseProps.dialogData.dialog);
    });
});

function getBaseProps(triggerId, elements) {
    const dialogData = {
        dialog: {
            callback_id: 'somecallbackid',
            elements,
            icon_url: 'icon_url',
            notify_on_cancel: true,
            state: 'somestate',
            submit_label: 'Submit Test',
            title: 'Dialog Test',
        },
        trigger_id: triggerId,
        url: 'https://localhost:8065/dialog_submit',
    };

    return {
        actions: {
            showModal: jest.fn(),
            submitInteractiveDialog: jest.fn(),
        },
        triggerId,
        dialogData,
        theme: {},
    };
}
