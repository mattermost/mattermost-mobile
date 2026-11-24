// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ExpoImageAnimated} from '@components/expo_image';
import {Preferences} from '@constants';
import {CustomThemeProvider, getDefaultThemeByAppearance} from '@context/theme';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {blendColors, getComponents, getProfileImageBackground} from '@utils/theme';

import Image from './image';

jest.mock('@components/expo_image', () => ({
    ExpoImageAnimated: jest.fn(),
}));
jest.mocked(ExpoImageAnimated).mockImplementation(({style}) => React.createElement('ExpoImageAnimated', {style, testID: 'profile_picture.image'}));

describe('ProfilePicture Image', () => {
    const theme = getDefaultThemeByAppearance();
    const author = TestHelper.fakeUser({id: 'user-id'});

    it.each([
        ['a remote profile image', undefined],
        ['a local profile image', {uri: 'file:///tmp/avatar.png'}],
    ])('should fill the avatar circle with an opaque blend of the channel text and background colors for %s', (_, source) => {
        const {getByTestId} = renderWithIntlAndTheme(
            <Image
                author={author}
                size={32}
                source={source}
                url='https://server.example.com'
            />,
        );

        const style = getByTestId('profile_picture.image').props.style;
        expect(style).toEqual({
            borderRadius: 16,
            backgroundColor: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.08),
            height: 32,
            width: 32,
        });

        // Avatars are also rendered on non-center surfaces (e.g. the sidebar), where a translucent fill disappears
        expect(getComponents(style.backgroundColor).alpha).toBe(1);
    });

    it('should use the sidebar-visible fill when not on center bg', () => {
        const sidebarTheme = Preferences.THEMES.quartz;
        const {getByTestId} = renderWithIntlAndTheme(
            <CustomThemeProvider theme={sidebarTheme}>
                <Image
                    author={author}
                    size={32}
                    isOnCenterBg={false}
                    url='https://server.example.com'
                />
            </CustomThemeProvider>,
        );

        const style = getByTestId('profile_picture.image').props.style;
        expect(style.backgroundColor).toBe(getProfileImageBackground(sidebarTheme, false));
    });

    it('should use imageBackgroundColor as the fill when provided', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <Image
                author={author}
                size={32}
                imageBackgroundColor='#ffffff'
                url='https://server.example.com'
            />,
        );

        const style = getByTestId('profile_picture.image').props.style;
        expect(style.backgroundColor).toBe('#ffffff');
    });
});
