// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import {General, Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import IntroOptions from '../options';

import DirectChannel from './direct_channel';

jest.mock('@actions/remote/user', () => ({
    fetchProfilesInChannel: jest.fn(),
}));

jest.mock('../options', () => ({__esModule: true, default: jest.fn()}));

describe('DirectChannel intro', () => {
    const getBaseProps = (): ComponentProps<typeof DirectChannel> => ({
        canWrite: true,
        channel: TestHelper.fakeChannelModel({id: 'dmchannelid', type: General.DM_CHANNEL, name: 'userid1__userid2', displayName: 'Other'}),
        currentUserId: 'userid1',
        isBot: false,
        members: [],
        theme: Preferences.THEMES.denim,
        hasGMasDMFeature: true,
    });

    beforeEach(() => {
        jest.mocked(IntroOptions).mockImplementation((props) => React.createElement(View, {testID: 'intro_options', ...props}));
    });

    it('should offer to set the header while the DM/GM write decision allows', () => {
        const {getByTestId} = renderWithIntlAndTheme(<DirectChannel {...getBaseProps()}/>);

        expect(getByTestId('intro_options')).toHaveProp('header', true);
    });

    it('should not offer to set the header while the DM/GM write decision denies', () => {
        const props = getBaseProps();
        props.canWrite = false;
        const {getByTestId} = renderWithIntlAndTheme(<DirectChannel {...props}/>);

        expect(getByTestId('intro_options')).toHaveProp('header', false);
    });
});
