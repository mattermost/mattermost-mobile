// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import PlusMenu from './index';

describe('channel_list/header/plus_menu', () => {
    const getBaseProps = (): ComponentProps<typeof PlusMenu> => ({
        canCreateChannels: true,
        canJoinChannels: true,
        canInvitePeople: true,
        canStartDirectMessage: true,
    });

    it('should offer to open a direct message', () => {
        const {getByTestId} = renderWithIntlAndTheme(<PlusMenu {...getBaseProps()}/>);

        expect(getByTestId('plus_menu_item.open_direct_message')).toBeTruthy();
    });

    it('should not offer to open a direct message while starting one is not allowed', () => {
        const props = getBaseProps();
        props.canStartDirectMessage = false;
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<PlusMenu {...props}/>);

        expect(queryByTestId('plus_menu_item.open_direct_message')).toBeNull();
        expect(getByTestId('plus_menu_item.browse_channels')).toBeTruthy();
    });
});
