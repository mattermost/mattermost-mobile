// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {Pressable, Text} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import {StaticSelectElement} from './static_select_element';

jest.mock('@components/autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('StaticSelectElement', () => {
    const onAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(AutocompleteSelector).mockImplementation((props: {
            testID?: string;
            onSelected: (item: SelectedDialogOption) => void;
            disabled?: boolean;
            selected?: string;
        }) => (
            React.createElement(Pressable, {
                testID: props.testID,
                disabled: props.disabled,
                onPress: () => props.onSelected({text: 'Beta', value: 'b'}),
            }, React.createElement(Text, null, props.selected ?? 'none'))
        ));
    });

    function getBaseProps(): ComponentProps<typeof StaticSelectElement> {
        return {
            element: {
                type: 'static_select',
                action_id: 'pick_one',
                placeholder: 'Choose',
                options: [
                    {text: 'Alpha', value: 'a'},
                    {text: 'Beta', value: 'b'},
                ],
                initial_option: 'a',
            },
            onAction,
        };
    }

    function renderSelect(
        props: ComponentProps<typeof StaticSelectElement>,
    ) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <StaticSelectElement {...props}/>
            </MmBlocksContextProvider>,
        );
    }

    it('should return null when action_id is missing', () => {
        const {toJSON} = renderSelect({
            ...getBaseProps(),
            element: {
                type: 'static_select',
                action_id: '',
                placeholder: 'Choose',
                options: [{text: 'Alpha', value: 'a'}],
            },
        });

        expect(toJSON()).toBeNull();
        expect(jest.mocked(AutocompleteSelector)).not.toHaveBeenCalled();
    });

    it('should return null when static options are empty and data source is not dynamic', () => {
        const {toJSON} = renderSelect({
            ...getBaseProps(),
            element: {
                type: 'static_select',
                action_id: 'pick_one',
                placeholder: 'Choose',
                options: [],
            },
        });

        expect(toJSON()).toBeNull();
        expect(jest.mocked(AutocompleteSelector)).not.toHaveBeenCalled();
    });

    it('should render for dynamic data sources without static options', () => {
        const {getByTestId} = renderSelect({
            ...getBaseProps(),
            element: {
                type: 'static_select',
                action_id: 'pick_user',
                placeholder: 'Choose user',
                data_source: 'users',
            },
        });
        expect(getByTestId('mm_blocks.static_select.pick_user')).toBeTruthy();
    });

    it('should call onAction and update selected value on selection', async () => {
        onAction.mockResolvedValue(undefined);
        const {getByTestId, getByText} = renderSelect({
            ...getBaseProps(),
            element: {
                ...getBaseProps().element,
                cookie: 'select-cookie',
                query: {source: 'mm_blocks'},
            },
        });

        expect(getByText('a')).toBeTruthy();

        fireEvent.press(getByTestId('mm_blocks.static_select.pick_one'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(onAction).toHaveBeenCalledWith('pick_one', 'b', {source: 'mm_blocks'}, 'select-cookie');
        expect(getByText('b')).toBeTruthy();
    });
});
