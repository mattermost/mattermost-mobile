// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';
import {of as of$} from 'rxjs';

import {observeBlockActionsEnabled} from '@queries/servers/features';

import DialogRouterScreen from './index';

jest.mock('@nozbe/watermelondb/react', () => ({
    withDatabase: jest.fn((Component) => Component),
    withObservables: jest.fn((_, observableMapper) => {
        // eslint-disable-next-line react/display-name
        return (Component: React.ComponentType) => (props: Record<string, unknown>) => {
            const observables = observableMapper(props);
            const mockedProps: Record<string, unknown> = {};
            for (const key of Object.keys(observables)) {
                observables[key].subscribe((value: unknown) => {
                    mockedProps[key] = value;
                });
            }
            return (
                <Component
                    {...props}
                    {...mockedProps}
                />
            );
        };
    }),
}));

jest.mock('@queries/servers/features', () => ({
    observeBlockActionsEnabled: jest.fn(),
}));

jest.mock('./blocks_dialog_router', () => {
    const mockReact = require('react');
    return {
        BlocksDialogRouter: jest.fn(() => mockReact.createElement('View', {testID: 'blocks-dialog-router'})),
    };
});

jest.mock('./dialog_router', () => {
    const mockReact = require('react');
    return {
        DialogRouter: jest.fn(() => mockReact.createElement('View', {testID: 'apps-form-dialog-router'})),
    };
});

const mockedObserveBlockActionsEnabled = jest.mocked(observeBlockActionsEnabled);

describe('DialogRouterScreen', () => {
    const config: InteractiveDialogConfig = {
        trigger_id: 'trigger',
        url: 'https://example.com/dialog',
        dialog: {title: 'Legacy', elements: []},
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render BlocksDialogRouter when block actions are enabled', () => {
        mockedObserveBlockActionsEnabled.mockReturnValue(of$(true));

        const {getByTestId} = render(<DialogRouterScreen config={config}/>);

        expect(getByTestId('blocks-dialog-router')).toBeTruthy();
    });

    it('should render Apps Form DialogRouter when block actions are disabled', () => {
        mockedObserveBlockActionsEnabled.mockReturnValue(of$(false));

        const {getByTestId} = render(<DialogRouterScreen config={config}/>);

        expect(getByTestId('apps-form-dialog-router')).toBeTruthy();
    });
});
