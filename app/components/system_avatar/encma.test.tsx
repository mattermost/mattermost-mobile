// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';

import SystemAvatar from './index';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('ENCMA system avatar', () => {
    it('uses ENCMA artwork instead of the upstream product glyph', () => {
        render(<SystemAvatar theme={Preferences.THEMES.denim}/>);

        expect(screen.getByTestId('system_avatar.encma_logo')).toBeTruthy();
        expect(screen.queryByTestId('system_avatar.mattermost_logo')).toBeNull();
    });
});
