// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {goToPlaybookRuns} from '@playbooks/screens/navigation';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntl, waitFor} from '@test/intl-test-helper';

import PlaybookRunsOption from './playbook_runs_option';

jest.mock('@components/option_item');
jest.mocked(OptionItem).mockImplementation((props) => React.createElement('OptionItem', {testID: 'option-item', ...props}));

jest.mock('@playbooks/screens/navigation');

describe('PlaybookRunsOption', () => {
    const baseProps = {
        channelId: 'channel-id',
        playbooksActiveRuns: 3,
        channelName: 'channel-name',
    };

    it('renders correctly', () => {
        const {getByTestId} = renderWithIntl(<PlaybookRunsOption {...baseProps}/>);

        const optionItem = getByTestId('option-item');
        expect(optionItem).toBeTruthy();
        expect(optionItem.props.label).toBe('Playbook runs');
        expect(optionItem.props.info).toBe('3');
        expect(optionItem.props.icon).toBe('product-playbooks');
        expect(optionItem.props.type).toBe('arrow');
        expect(optionItem.props.action).toBeDefined();
    });

    it('uses correct type based on platform', () => {
        // We need to use any because typescript is not inferring the correct type for the dict
        jest.mocked(Platform.select).mockImplementation((dict) => dict.android ?? (dict as any).default);
        const {getByTestId} = renderWithIntl(<PlaybookRunsOption {...baseProps}/>);

        const optionItem = getByTestId('option-item');
        expect(optionItem.props.type).toBe('default');
    });

    it('calls goToPlaybookRuns when pressed', async () => {
        const {getByTestId} = renderWithIntl(<PlaybookRunsOption {...baseProps}/>);

        const optionItem = getByTestId('option-item');
        optionItem.props.action();

        await waitFor(() => {
            expect(dismissBottomSheet).toHaveBeenCalled();
            expect(goToPlaybookRuns).toHaveBeenCalledWith(expect.anything(), 'channel-id', 'channel-name');
        });
    });
});
