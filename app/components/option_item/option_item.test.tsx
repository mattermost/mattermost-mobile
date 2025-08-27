// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import UserChip from '@components/chips/user_chip';
import Preferences from '@constants/preferences';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import OptionIcon from './option_icon';
import RadioItem from './radio_item';

import OptionItem from './index';

jest.mock('./option_icon');
jest.mocked(OptionIcon).mockImplementation((props) => React.createElement('OptionIcon', {...props, testID: 'option-item.icon.mock'}));

jest.mock('@components/chips/user_chip');
jest.mocked(UserChip).mockImplementation((props) => React.createElement('UserChip', {...props, testID: 'option-item.user_chip.mock'}));

jest.mock('./radio_item');
jest.mocked(RadioItem).mockImplementation((props) => React.createElement('RadioItem', props));

describe('OptionItem', () => {
    function getBaseProps(): ComponentProps<typeof OptionItem> {
        return {
            label: 'Test Option',
            type: 'default',
            testID: 'option-item',
        };
    }

    it('renders correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const optionItem = getByTestId('option-item');
        expect(optionItem).toBeTruthy();
        const label = getByText('Test Option');
        expect(label).toBeTruthy();
        expect(label).toHaveStyle({fontWeight: '400'});

        // No description
        expect(queryByTestId('option-item.description')).toBeNull();

        // No radio component
        expect(queryByTestId('option-item.selected')).toBeNull();
        expect(queryByTestId('option-item.not_selected')).toBeNull();

        // No icon
        expect(queryByTestId('option-item.icon.mock')).toBeNull();

        // No user chip
        expect(queryByTestId('option-item.user_chip.mock')).toBeNull();

        // No info
        expect(queryByTestId('option-item.info')).toBeNull();

        // No action whatsoever
        expect(queryByTestId('option-item.selected')).toBeNull();
        expect(queryByTestId('option-item.toggled.false.button')).toBeNull();
        expect(queryByTestId('option-item.toggled.true.button')).toBeNull();
        expect(queryByTestId('option-item.remove.button')).toBeNull();
        expect(queryByTestId('option-item.arrow.icon')).toBeNull();
    });

    it('renders with description when provided', () => {
        const props = getBaseProps();
        props.description = 'Test description';

        const {getByText, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let description = getByText('Test description');
        expect(description).toBeTruthy();
        expect(description.props.numberOfLines).toBeUndefined();
        expect(description).not.toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});

        props.descriptionNumberOfLines = 2;
        props.destructive = true;
        rerender(<OptionItem {...props}/>);

        description = getByText('Test description');
        expect(description).toBeTruthy();
        expect(description.props.numberOfLines).toBe(2);
        expect(description).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
    });

    it('renders with icon when provided', () => {
        const props = getBaseProps();
        props.icon = 'test-icon';
        props.iconColor = '#ff0000';

        const {getByTestId, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let optionItem = getByTestId('option-item.icon.mock');
        expect(optionItem.props.icon).toBe('test-icon');
        expect(optionItem.props.iconColor).toBe('#ff0000');
        expect(optionItem.props.destructive).toBeFalsy();

        props.destructive = true;
        rerender(<OptionItem {...props}/>);

        optionItem = getByTestId('option-item.icon.mock');
        expect(optionItem.props.destructive).toBeTruthy();
    });

    it('renders with destructive styling when destructive is true', () => {
        const props = getBaseProps();
        props.destructive = true;

        const {getByText, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let label = getByText('Test Option');
        expect(label).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});

        props.destructive = false;
        rerender(<OptionItem {...props}/>);

        label = getByText('Test Option');
        expect(label).not.toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
    });

    it('renders with inline layout when inline is true and description exists', () => {
        const props = getBaseProps();
        props.inline = true;

        const {getByText, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        // No inline style yet
        expect(getByText('Test Option')).toHaveStyle({fontWeight: '400'});

        props.description = 'Test description';
        rerender(<OptionItem {...props}/>);

        expect(getByText('Test Option')).toHaveStyle({fontWeight: '600'});
        expect(getByText('Test description')).toHaveStyle({color: Preferences.THEMES.denim.centerChannelColor});
    });

    it('renders description as destructive only if nonDestructiveDescription is false', () => {
        const props = getBaseProps();
        props.description = 'Test description';
        props.destructive = true;
        props.nonDestructiveDescription = false;

        const {rerender, getByText} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let label = getByText('Test Option');
        let description = getByText('Test description');
        expect(label).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
        expect(description).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});

        props.nonDestructiveDescription = true;
        rerender(<OptionItem {...props}/>);

        label = getByText('Test Option');
        description = getByText('Test description');
        expect(label).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
        expect(description).not.toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
    });

    it('renders with info text when provided', () => {
        const props = getBaseProps();
        props.info = 'Additional info';

        const {getByText} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const info = getByText('Additional info');
        expect(info).toBeTruthy();
    });

    it('renders with destructive info styling when destructive is true', () => {
        const props = getBaseProps();
        props.info = 'Destructive info';
        props.destructive = true;

        const {getByText, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let info = getByText('Destructive info');
        expect(info).toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});

        props.destructive = false;
        rerender(<OptionItem {...props}/>);

        info = getByText('Destructive info');
        expect(info).not.toHaveStyle({color: Preferences.THEMES.denim.dndIndicator});
    });

    it('renders with user chip when info is UserChipData', () => {
        const props = getBaseProps();
        props.info = {
            user: TestHelper.fakeUserModel(),
            onPress: jest.fn(),
            teammateNameDisplay: 'nickname_full_name',
        };

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const userChip = getByTestId('option-item.user_chip.mock');
        expect(userChip).toBeTruthy();
        expect(userChip.props.user).toBe(props.info.user);
        expect(userChip.props.onPress).toBe(props.info.onPress);
        expect(userChip.props.teammateNameDisplay).toBe(props.info.teammateNameDisplay);
    });

    it('shows link type correctly', () => {
        const props = getBaseProps();
        props.type = 'link';
        props.label = 'Test Link';

        const {getByText} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const link = getByText('Test Link');
        expect(link).toBeTruthy();
        expect(link).toHaveStyle({color: Preferences.THEMES.denim.linkColor});
    });

    it('shows select type correctly', () => {
        const props = getBaseProps();
        props.type = 'select';
        props.selected = true;

        const {getByTestId, rerender, queryByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let selectedIcon = getByTestId('option-item.selected');
        expect(selectedIcon).toBeTruthy();

        props.selected = false;
        rerender(<OptionItem {...props}/>);

        selectedIcon = queryByTestId('option-item.selected');
        expect(selectedIcon).toBeNull();
    });

    it('shows radio type correctly', () => {
        const props = getBaseProps();
        props.type = 'radio';
        props.selected = true;
        props.isRadioCheckmark = true;

        const {getByTestId, rerender, queryByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let radioItem = getByTestId('option-item.selected');
        expect(radioItem).toBeTruthy();
        expect(radioItem.props.checkedBody).toBe(true);
        expect(radioItem.props.selected).toBe(true);

        props.selected = false;
        rerender(<OptionItem {...props}/>);

        radioItem = queryByTestId('option-item.not_selected');
        expect(radioItem).toBeTruthy();
        expect(radioItem.props.checkedBody).toBe(true);
        expect(radioItem.props.selected).toBe(false);

        props.isRadioCheckmark = false;
        rerender(<OptionItem {...props}/>);

        radioItem = queryByTestId('option-item.not_selected');
        expect(radioItem).toBeTruthy();
        expect(radioItem.props.checkedBody).toBe(false);
        expect(radioItem.props.selected).toBe(false);
    });

    it('shows toggle type correctly', () => {
        const props = getBaseProps();
        props.type = 'toggle';
        props.selected = true;
        props.action = jest.fn();

        const {getByTestId, rerender} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        let toggle = getByTestId('option-item.toggled.true.button');
        expect(toggle).toBeTruthy();

        props.selected = false;
        rerender(<OptionItem {...props}/>);

        toggle = getByTestId('option-item.toggled.false.button');
        expect(toggle).toBeTruthy();
    });

    it('calls action for toggles', () => {
        const props = getBaseProps();
        props.type = 'toggle';
        props.selected = true;
        props.action = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const toggle = getByTestId('option-item.toggled.true.button');
        act(() => {
            fireEvent(toggle, 'valueChange', false);
        });
        expect(props.action).toHaveBeenCalledWith(false);

        act(() => {
            fireEvent(toggle, 'valueChange', true);
        });
        expect(props.action).toHaveBeenCalledWith(true);
    });

    it('doesnt call action for toggles when text is pressed', () => {
        const props = getBaseProps();
        props.type = 'toggle';
        props.selected = true;
        props.action = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const optionItem = getByTestId('option-item');
        expect(optionItem).toBeTruthy();

        act(() => {
            fireEvent.press(optionItem);
        });
        expect(props.action).not.toHaveBeenCalled();

        const toggle = getByTestId('option-item.toggled.true.button');
        act(() => {
            fireEvent(toggle, 'valueChange', false);
        });
        expect(props.action).toHaveBeenCalled();
    });

    it('shows arrow type correctly', () => {
        const props = getBaseProps();
        props.type = 'arrow';

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const arrowIcon = getByTestId('option-item.arrow.icon');
        expect(arrowIcon).toBeTruthy();
    });

    it('shows remove type correctly', () => {
        const props = getBaseProps();
        props.type = 'remove';
        props.action = jest.fn();
        props.onRemove = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const removeButton = getByTestId('option-item.remove.button');
        expect(removeButton).toBeTruthy();

        act(() => {
            fireEvent.press(removeButton);
        });
        expect(props.onRemove).toHaveBeenCalled();
        expect(props.action).not.toHaveBeenCalled();

        jest.mocked(props.onRemove).mockClear();
        jest.mocked(props.action).mockClear();

        act(() => {
            fireEvent.press(getByTestId('option-item'));
        });
        expect(props.action).toHaveBeenCalled();
        expect(props.onRemove).not.toHaveBeenCalled();
    });

    it('doesnt call action for none type', () => {
        const props = getBaseProps();
        props.type = 'none';
        props.action = jest.fn();

        const {getByTestId} = renderWithIntlAndTheme(<OptionItem {...props}/>);

        const optionItem = getByTestId('option-item');
        expect(optionItem).toBeTruthy();

        act(() => {
            fireEvent.press(optionItem);
        });
        expect(props.action).not.toHaveBeenCalled();
    });
});
