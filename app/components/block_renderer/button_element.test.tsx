// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {ButtonElement} from './button_element';

import type Database from '@nozbe/watermelondb/Database';

describe('ButtonElement', () => {
    const serverUrl = 'https://server.com';
    const theme = Preferences.THEMES.denim;
    const onAction = jest.fn();
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        await server.operator.handleConfigs({
            configs: [{id: 'MaxMarkdownNodes', value: '1000'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof ButtonElement> {
        return {
            element: {
                type: 'button',
                text: 'Submit',
                action_id: 'submit_action',
                style: 'primary',
            },
            onAction,
            theme,
        };
    }

    function renderButton(
        props: ComponentProps<typeof ButtonElement>,
    ) {
        return renderWithEverything(
            <ButtonElement {...props}/>,
            {database, serverUrl},
        );
    }

    it('should return null when text or action_id is missing', () => {
        const {queryByTestId, rerender} = renderButton({
            ...getBaseProps(),
            element: {type: 'button', text: '', action_id: 'submit_action'},
        });
        expect(queryByTestId('mm_blocks.button.submit_action')).toBeNull();

        rerender(
            <ButtonElement
                {...getBaseProps()}
                element={{type: 'button', text: 'Submit', action_id: ''}}
            />,
        );
        expect(queryByTestId('mm_blocks.button.')).toBeNull();
    });

    it('should call onAction with action_id, query, and cookie on press', async () => {
        onAction.mockResolvedValue(undefined);
        const {getByTestId} = renderButton({
            ...getBaseProps(),
            element: {
                type: 'button',
                text: 'Submit',
                action_id: 'submit_action',
                query: {row: '1'},
                cookie: 'attachment-cookie',
            },
        });

        fireEvent.press(getByTestId('mm_blocks.button.submit_action'));

        await act(async () => {
            // onAction sets back `isExecuting` to false when it resolves
            // causing an extra update "outside of an act". This removes
            // the error by waiting for that update to complete.
            await Promise.resolve();
        });

        expect(onAction).toHaveBeenCalledWith('submit_action', undefined, {row: '1'}, 'attachment-cookie');
    });

    it('should not dispatch twice on rapid double press', async () => {
        onAction.mockReturnValue(new Promise(() => {}));
        const {getByTestId} = renderButton(getBaseProps());
        const button = getByTestId('mm_blocks.button.submit_action');

        fireEvent.press(button);
        fireEvent.press(button);

        expect(onAction).toHaveBeenCalledTimes(1);
    });
});
