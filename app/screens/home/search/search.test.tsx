// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
jest.mock('@react-native-clipboard/clipboard', () => ({}));
jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import Search from './search';

describe('search', () => {
    it('should render search', () => {
        const {debug} = renderWithIntl(
            <NavigationContainer>
                <Search
                    teamId='a-team-id'
                    teams={[]}
                />
            </NavigationContainer>);
        debug();

        expect(1).toBe(1);
    });
});
