// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import InputQuickAction from '.';

describe('InputQuickAction', () => {
    it('should add If theres existing text and it doesnt end with a space, add a space before @', () => {
        const updateValue = jest.fn();
        const testID = 'test-id';
        const inputType = 'at';
        const focus = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(
            <InputQuickAction
                testID={testID}
                updateValue={updateValue}
                inputType={inputType}
                focus={focus}
            />);

        const icon = getByTestId('test-id');
        fireEvent.press(icon);

        expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
        const updateFunction = updateValue.mock.calls[0][0];
        expect(updateFunction('')).toBe('@');
        expect(focus).toHaveBeenCalled();
    });

    it('should add space before @ if there is existing text and it doesnt end with a space', () => {
        const updateValue = jest.fn();
        const testID = 'test-id';
        const inputType = 'at';
        const focus = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(
            <InputQuickAction
                testID={testID}
                updateValue={updateValue}
                inputType={inputType}
                focus={focus}
            />);

        const icon = getByTestId('test-id');
        fireEvent.press(icon);

        expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
        const updateFunction = updateValue.mock.calls[0][0];
        expect(updateFunction('Hello')).toBe('Hello @');
        expect(focus).toHaveBeenCalled();
    });

});
