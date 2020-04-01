// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Keyboard} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';
import {RequestStatus} from '@mm-redux/constants';

import {shallowWithIntl} from 'test/intl-test-helper';

import EditPost from './edit_post';

describe('EditPost', () => {
    const baseProps = {
        actions: {
            editPost: jest.fn(),
        },
        editPostRequest: {},
        post: {},
        theme: Preferences.THEMES.default,
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <EditPost {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should dismiss keyboard on close', () => {
        Keyboard.dismiss = jest.fn();
        expect(Keyboard.dismiss).not.toHaveBeenCalled();

        const wrapper = shallowWithIntl(
            <EditPost {...baseProps}/>,
        );
        wrapper.instance().close();
        expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    });

    test('should handle edit post request started', () => {
        const wrapper = shallowWithIntl(
            <EditPost {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.close = jest.fn();
        instance.emitEditing = jest.fn();

        let state = wrapper.state();
        expect(state.editing).toBeFalsy();
        expect(state.error).toBeFalsy();

        const editPostRequest = {
            status: RequestStatus.STARTED,
        };
        wrapper.setProps({editPostRequest});
        state = wrapper.state();

        expect(instance.close).not.toHaveBeenCalled();
        expect(instance.emitEditing).toHaveBeenCalledTimes(1);
        expect(instance.emitEditing).toHaveBeenCalledWith(true);
        expect(state.editing).toBeTruthy();
        expect(state.error).toBeFalsy();
    });

    test('should handle edit post request failure', () => {
        const wrapper = shallowWithIntl(
            <EditPost {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.close = jest.fn();
        instance.emitEditing = jest.fn();

        let state = wrapper.state();
        expect(state.editing).toBeFalsy();
        expect(state.error).toBeFalsy();

        const editPostRequest = {
            status: RequestStatus.FAILURE,
            error: 'error',
        };
        wrapper.setProps({editPostRequest});
        state = wrapper.state();

        expect(instance.close).not.toHaveBeenCalled();
        expect(instance.emitEditing).toHaveBeenCalledTimes(1);
        expect(instance.emitEditing).toHaveBeenCalledWith(false);
        expect(state.editing).toBeFalsy();
        expect(state.error).toBeTruthy();
    });

    test('should handle edit post request success', () => {
        const wrapper = shallowWithIntl(
            <EditPost {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.close = jest.fn();
        instance.emitEditing = jest.fn();

        let state = wrapper.state();
        expect(state.editing).toBeFalsy();
        expect(state.error).toBeFalsy();

        const editPostRequest = {
            status: RequestStatus.SUCCESS,
        };
        wrapper.setProps({editPostRequest});
        state = wrapper.state();

        expect(instance.close).toHaveBeenCalled();
        expect(instance.emitEditing).toHaveBeenCalledTimes(1);
        expect(instance.emitEditing).toHaveBeenCalledWith(false);
        expect(state.editing).toBeFalsy();
        expect(state.error).toBeFalsy();
    });
});