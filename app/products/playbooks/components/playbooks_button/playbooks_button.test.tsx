// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntl} from '@test/intl-test-helper';

import PlaybooksButton from './playbooks_button';

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: jest.fn((callback) => callback),
}));

jest.mock('@playbooks/screens/navigation', () => ({
    goToParticipantPlaybooks: jest.fn(),
}));

describe('PlaybooksButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with default props', () => {
        const {getByTestId, getByText} = renderWithIntl(<PlaybooksButton/>);

        const icon = getByTestId('channel_list.playbooks.button-icon');
        expect(icon).toHaveProp('name', 'product-playbooks');
        expect(getByText('Playbook runs')).toBeTruthy();
    });

    it('calls goToParticipantPlaybooks when pressed', () => {
        const {goToParticipantPlaybooks} = require('@playbooks/screens/navigation');
        const {getByTestId} = renderWithIntl(<PlaybooksButton/>);

        const button = getByTestId('channel_list.playbooks.button');
        fireEvent.press(button);

        expect(goToParticipantPlaybooks).toHaveBeenCalled();
    });
});
