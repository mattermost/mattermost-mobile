// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import SelectedChip from '@components/chips/selected_chip';
import SelectedUserChip from '@components/chips/selected_user_chip';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {fireEvent, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Selection from './selection';
import SelectionSearchBar from './selection_search_bar';
import SelectionTeamBar from './selection_team_bar';
import TextItem from './text_item';
import {TextItemType} from './types';

jest.mock('./selection_search_bar');
jest.mocked(SelectionSearchBar).mockImplementation(
    (props) => React.createElement('SelectionSearchBar', {testID: 'selection-search-bar', ...props}),
);

jest.mock('./selection_team_bar');
jest.mocked(SelectionTeamBar).mockImplementation(
    (props) => React.createElement('SelectionTeamBar', {testID: 'selection-team-bar', ...props}),
);

jest.mock('./text_item');
jest.mocked(TextItem).mockImplementation(
    (props) => React.createElement('TextItem', {...props}),
);

jest.mock('@components/chips/selected_chip');
jest.mocked(SelectedChip).mockImplementation(
    (props) => React.createElement('SelectedChip', {testID: 'selected-chip', ...props}),
);

jest.mock('@components/chips/selected_user_chip');
jest.mocked(SelectedUserChip).mockImplementation(
    (props) => React.createElement('SelectedUserChip', {testID: 'selected-user-chip', ...props}),
);

jest.mock('@components/user_item');
jest.mocked(UserItem).mockImplementation(
    (props) => React.createElement('UserItem', {testID: 'user-item', ...props}),
);

jest.mock('@components/option_item');
jest.mocked(OptionItem).mockImplementation(
    (props) => React.createElement('OptionItem', {testID: 'option-item', ...props}),
);

jest.mock('@components/floating_input/floating_text_input_label', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingTextInput).mockImplementation(
    (props) => React.createElement('FloatingTextInput', {testID: 'floating-text-input', ...props}),
);

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));

describe('Selection', () => {
    const mockOnSearchChange = jest.fn();
    const mockOnSelectItem = jest.fn();
    const mockOnRemoveItem = jest.fn();
    const mockOnClose = jest.fn().mockResolvedValue(undefined);
    const mockOnSendOptionsChange = jest.fn();

    function getBaseProps(): ComponentProps<typeof Selection> {
        return {
            teamId: 'team-1',
            teamDisplayName: 'Test Team',
            teamLastIconUpdate: 1234567890,
            teamInviteId: 'invite-id-1',
            teammateNameDisplay: 'username',
            serverUrl: 'https://test.server.com',
            term: '',
            searchResults: [],
            selectedIds: {},
            keyboardOverlap: 0,
            wrapperHeight: 800,
            loading: false,
            testID: 'invite.selection',
            sendOptions: {
                inviteAsGuest: false,
                includeCustomMessage: false,
                customMessage: '',
                selectedChannels: [],
                guestMagicLink: false,
            },
            onSendOptionsChange: mockOnSendOptionsChange,
            onSearchChange: mockOnSearchChange,
            onSelectItem: mockOnSelectItem,
            onRemoveItem: mockOnRemoveItem,
            onClose: mockOnClose,
            canInviteGuests: true,
            allowGuestMagicLink: true,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        expect(getByTestId('selection-search-bar')).toBeTruthy();
        expect(getByTestId('selection-team-bar')).toBeTruthy();
    });

    it('renders selected items correctly', () => {
        const props = getBaseProps();
        const user = TestHelper.fakeUser({id: 'user-1', username: 'user1'});
        props.selectedIds = {
            'user-1': user,
            'email-1': 'test@example.com',
        };

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        expect(getByTestId('invite.selected_items')).toBeTruthy();
        const userChip = getByTestId('invite.selected_item');
        expect(userChip).toHaveProp('user', user);
        expect(userChip).toHaveProp('teammateNameDisplay', 'username');
        userChip.props.onPress('user-1');
        expect(mockOnRemoveItem).toHaveBeenCalledTimes(1);
        expect(mockOnRemoveItem).toHaveBeenCalledWith('user-1');
        const chip = getByTestId('invite.selected_item.test@example.com');
        expect(chip).toHaveProp('id', 'email-1');
        expect(chip).toHaveProp('text', 'test@example.com');
        chip.props.onRemove('email-1');
        expect(mockOnRemoveItem).toHaveBeenCalledTimes(2);
        expect(mockOnRemoveItem).toHaveBeenCalledWith('email-1');
    });

    it('does not render selected items when empty', () => {
        const props = getBaseProps();
        const {queryByTestId} = renderWithIntl(<Selection {...props}/>);

        expect(queryByTestId('invite.selected_items')).toBeNull();
    });

    it('renders search results correctly', () => {
        const props = getBaseProps();
        const user = TestHelper.fakeUser({id: 'user-1', username: 'user1'});
        props.searchResults = [user, 'test@example.com'];
        props.term = 'test';

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        expect(getByTestId('invite.search_list')).toBeVisible();
        const userItem = getByTestId('invite.search_list_user_item');
        expect(userItem).toHaveProp('user', user);
        expect(userItem).toHaveProp('onUserPress', mockOnSelectItem);
        userItem.props.onUserPress(user);
        expect(mockOnSelectItem).toHaveBeenCalledTimes(1);
        expect(mockOnSelectItem).toHaveBeenCalledWith(user);
        const textItem = getByTestId('invite.search_list_text_item');
        expect(textItem).toHaveProp('text', 'test@example.com');
        expect(textItem).toHaveProp('type', TextItemType.SEARCH_INVITE);
        fireEvent.press(textItem);
        expect(mockOnSelectItem).toHaveBeenCalledTimes(2);
        expect(mockOnSelectItem).toHaveBeenCalledWith('test@example.com');
    });

    it('renders no results message when term exists and no results', () => {
        const props = getBaseProps();
        props.term = 'nonexistent';
        props.searchResults = [];
        props.loading = false;

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        const textItem = getByTestId('invite.search_list_no_results');
        expect(textItem).toHaveProp('text', 'nonexistent');
        expect(textItem).toHaveProp('type', TextItemType.SEARCH_NO_RESULTS);
    });

    it('renders invite as guest option when canInviteGuests is true', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        const optionItem = getByTestId('invite.invite_as_guest');
        expect(optionItem).toHaveProp('label', 'Invite as guest');
        expect(optionItem).toHaveProp('type', 'toggle');
        expect(optionItem).toHaveProp('selected', false);
        expect(optionItem).toHaveProp('action', expect.any(Function));
        expect(optionItem).toHaveProp('testID', 'invite.invite_as_guest');
        optionItem.props.action();
        expect(mockOnSendOptionsChange).toHaveBeenCalledTimes(1);
        const setStateFunction = mockOnSendOptionsChange.mock.calls[0][0];
        const result = setStateFunction(props.sendOptions);
        expect(result.inviteAsGuest).toBe(true);
    });

    it('does not render invite as guest option when canInviteGuests is false', () => {
        const props = getBaseProps();
        props.canInviteGuests = false;

        const {queryByTestId} = renderWithIntl(<Selection {...props}/>);

        // The invite as guest option should not be rendered
        const optionItem = queryByTestId('invite.invite_as_guest');
        expect(optionItem).toBeNull();
    });

    it('renders custom message input when includeCustomMessage is true', () => {
        const props = getBaseProps();
        props.sendOptions = {
            inviteAsGuest: true,
            includeCustomMessage: true,
            customMessage: 'Test message',
            selectedChannels: [],
            guestMagicLink: false,
        };

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        expect(getByTestId('invite.custom_message')).toBeTruthy();
    });

    it('handles channel selection', () => {
        const props = getBaseProps();
        props.sendOptions = {
            inviteAsGuest: true,
            includeCustomMessage: false,
            customMessage: '',
            selectedChannels: [],
            guestMagicLink: false,
        };

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        const channelOption = getByTestId('invite.selected_channels');
        channelOption.props.action();
        expect(goToScreen).toHaveBeenCalledWith(
            Screens.INTEGRATION_SELECTOR,
            expect.any(String),
            expect.objectContaining({
                dataSource: 'channels',
                isMultiselect: true,
            }),
        );
    });

    it('renders guest magic link option when guestMagicLink is true', () => {
        const props = getBaseProps();
        props.allowGuestMagicLink = true;
        props.sendOptions = {
            inviteAsGuest: true,
            includeCustomMessage: false,
            customMessage: '',
            selectedChannels: [],
            guestMagicLink: false,
        };

        const {getByTestId} = renderWithIntl(<Selection {...props}/>);

        const optionItem = getByTestId('invite.guest_magic_link');
        expect(optionItem).toHaveProp('label', 'Allow newly created guests to login without password');
        expect(optionItem).toHaveProp('type', 'toggle');
        expect(optionItem).toHaveProp('selected', false);

        optionItem.props.action();
        expect(mockOnSendOptionsChange).toHaveBeenCalledTimes(1);
        const setStateFunction = mockOnSendOptionsChange.mock.calls[0][0];
        const result = setStateFunction(props.sendOptions);
        expect(result.guestMagicLink).toBe(true);
    });

    it('does not render guest magic link option when allowGuestMagicLink is false', () => {
        const props = getBaseProps();
        props.allowGuestMagicLink = false;
        props.sendOptions = {
            inviteAsGuest: true,
            includeCustomMessage: false,
            customMessage: '',
            selectedChannels: [],
            guestMagicLink: false,
        };
        const {queryByTestId} = renderWithIntl(<Selection {...props}/>);

        const optionItem = queryByTestId('invite.guest_magic_link');
        expect(optionItem).toBeNull();
    });

    it('passes correct props to SelectionSearchBar', () => {
        const props = getBaseProps();
        props.term = 'test search';

        renderWithIntl(<Selection {...props}/>);

        const searchBar = jest.mocked(SelectionSearchBar).mock.calls[0][0];
        expect(searchBar.term).toBe('test search');
        expect(searchBar.onSearchChange).toBe(mockOnSearchChange);
    });

    it('passes correct props to SelectionTeamBar', () => {
        const props = getBaseProps();

        renderWithIntl(<Selection {...props}/>);

        const teamBar = jest.mocked(SelectionTeamBar).mock.calls[0][0];
        expect(teamBar.teamId).toBe('team-1');
        expect(teamBar.teamDisplayName).toBe('Test Team');
        expect(teamBar.onClose).toBe(mockOnClose);
    });
});

