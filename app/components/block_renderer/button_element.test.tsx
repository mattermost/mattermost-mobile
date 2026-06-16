// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {ButtonElement} from './button_element';

describe('ButtonElement', () => {
    const theme = Preferences.THEMES.denim;
    const onAction = jest.fn();

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
        return renderWithIntlAndTheme(
            <ButtonElement {...props}/>,
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
