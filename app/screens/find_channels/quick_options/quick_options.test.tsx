// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import QuickOptions from './quick_options';

describe('find_channels/quick_options', () => {
    const getBaseProps = (): ComponentProps<typeof QuickOptions> => ({
        canCreateChannels: true,
        canJoinChannels: true,
        canStartDirectMessage: true,
        close: jest.fn(),
    });

    it('should offer to open a direct message', () => {
        const {getByTestId} = renderWithIntlAndTheme(<QuickOptions {...getBaseProps()}/>);

        expect(getByTestId('find_channels.quick_options.open_dm.option')).toBeTruthy();
    });

    it('should not offer to open a direct message while starting one is not allowed', () => {
        const props = getBaseProps();
        props.canStartDirectMessage = false;
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<QuickOptions {...props}/>);

        expect(queryByTestId('find_channels.quick_options.open_dm.option')).toBeNull();
        expect(getByTestId('find_channels.quick_options.directory.option')).toBeTruthy();
        expect(getByTestId('find_channels.quick_options.new_channel.option')).toBeTruthy();
    });
});
