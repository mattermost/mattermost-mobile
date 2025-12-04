// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import React from 'react';
import {IntlProvider} from 'react-intl';

import {handleBindingClick} from '@actions/remote/apps';
import {handleGotoLocation} from '@actions/remote/command';
import {AppCallResponseTypes} from '@constants/apps';
import {showAppForm} from '@screens/navigation';

import {useAppBinding} from './apps';

jest.mock('@actions/remote/apps');
jest.mock('@actions/remote/command');
jest.mock('@screens/navigation', () => ({
    showAppForm: jest.fn(),
}));
jest.mock('@context/server', () => ({
    useServerUrl: () => 'http://localhost:8065',
}));

describe('useAppBinding', () => {
    const context = {
        channel_id: 'channel_id',
        team_id: 'team_id',
        post_id: 'post_id',
        root_id: 'root_id',
    };

    const binding = {
        app_id: 'app_id',
        location: 'post_menu',
        label: 'Test Binding',
    };

    const config = {
        onSuccess: jest.fn(),
        onError: jest.fn(),
        onForm: jest.fn(),
        onNavigate: jest.fn(),
    };

    const wrapper = ({children}: {children: React.ReactNode}) => (
        <IntlProvider
            messages={{}}
            locale='en'
        >
            {children}
        </IntlProvider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should handle OK response', async () => {
        const successResponse = {
            type: AppCallResponseTypes.OK,
            text: 'Success message',
        };

        (handleBindingClick as jest.Mock).mockResolvedValue({
            data: successResponse,
        });

        const {result} = renderHook(() => useAppBinding(context, config), {wrapper});
        const callback = await result.current(binding);
        await callback();

        expect(config.onSuccess).toHaveBeenCalledWith(successResponse, 'Success message');
        expect(config.onError).not.toHaveBeenCalled();
        expect(config.onForm).not.toHaveBeenCalled();
        expect(config.onNavigate).not.toHaveBeenCalled();
    });

    test('should handle error response', async () => {
        const errorResponse = {
            type: 'error',
            text: 'Error message',
        };

        (handleBindingClick as jest.Mock).mockResolvedValue({
            error: errorResponse,
        });

        const {result} = renderHook(() => useAppBinding(context, config), {wrapper});
        const callback = await result.current(binding);
        await callback();

        expect(config.onError).toHaveBeenCalledWith(errorResponse, 'Error message');
        expect(config.onSuccess).not.toHaveBeenCalled();
        expect(config.onForm).not.toHaveBeenCalled();
        expect(config.onNavigate).not.toHaveBeenCalled();
    });

    test('should handle NAVIGATE response with onNavigate config', async () => {
        const navigateResponse = {
            type: AppCallResponseTypes.NAVIGATE,
            navigate_to_url: 'http://example.com',
        };

        (handleBindingClick as jest.Mock).mockResolvedValue({
            data: navigateResponse,
        });

        const {result} = renderHook(() => useAppBinding(context, config), {wrapper});
        const callback = await result.current(binding);
        await callback();

        expect(config.onNavigate).toHaveBeenCalledWith(navigateResponse);
        expect(handleGotoLocation).not.toHaveBeenCalled();
        expect(config.onSuccess).not.toHaveBeenCalled();
        expect(config.onError).not.toHaveBeenCalled();
    });

    test('should handle FORM response with onForm config', async () => {
        const formResponse = {
            type: AppCallResponseTypes.FORM,
            form: {
                title: 'Test Form',
                fields: [],
            },
        };

        (handleBindingClick as jest.Mock).mockResolvedValue({
            data: formResponse,
        });

        const {result} = renderHook(() => useAppBinding(context, config), {wrapper});
        const callback = await result.current(binding);
        await callback();

        expect(config.onForm).toHaveBeenCalledWith(formResponse.form);
        expect(showAppForm).not.toHaveBeenCalled();
        expect(config.onSuccess).not.toHaveBeenCalled();
        expect(config.onError).not.toHaveBeenCalled();
    });

    test('should handle unknown response type', async () => {
        const unknownResponse = {
            type: 'UNKNOWN_TYPE',
        };

        (handleBindingClick as jest.Mock).mockResolvedValue({
            data: unknownResponse,
        });

        const {result} = renderHook(() => useAppBinding(context, config), {wrapper});
        const callback = await result.current(binding);
        await callback();

        expect(config.onError).toHaveBeenCalledWith(
            unknownResponse,
            'App response type not supported. Response type: UNKNOWN_TYPE.',
        );
        expect(config.onSuccess).not.toHaveBeenCalled();
        expect(config.onForm).not.toHaveBeenCalled();
        expect(config.onNavigate).not.toHaveBeenCalled();
    });
});
