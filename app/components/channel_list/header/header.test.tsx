// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {renderWithIntl} from '@test/intl-test-helper';

import Header from './header';

describe('components/channel_list/header', () => {
    it('Channel List Header Component should match snapshot', () => {
        const {toJSON} = renderWithIntl(
            <SafeAreaProvider>
                <Header
                    canCreateChannels={true}
                    canJoinChannels={true}
                    displayName={'Test!'}
                />
            </SafeAreaProvider>,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
