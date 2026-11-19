// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ExpoImageAnimated} from '@components/expo_image';
import {getDefaultThemeByAppearance} from '@context/theme';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {blendColors, getComponents} from '@utils/theme';

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
    ])('should fill the avatar circle with an opaque color distinct from the channel background for %s', (_, source) => {
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
        expect(style.backgroundColor).not.toBe(theme.centerChannelBg);

        // Avatars are also rendered on non-center surfaces (e.g. the sidebar), where a translucent fill disappears
        expect(getComponents(style.backgroundColor).alpha).toBe(1);
    });
});
