// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences, Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import MarkdownCodeBlock from './index';

jest.mock('@components/syntax_highlight', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    navigateToScreen: jest.fn(),
}));

describe('MarkdownCodeBlock', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should mark code params as internally serialized', () => {
        const code = '"hello"';
        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownCodeBlock
                content={code}
                language='json'
                textStyle={{}}
                theme={Preferences.THEMES.denim}
            />,
        );

        fireEvent.press(getByTestId('markdown_code_block'));

        expect(navigateToScreen).toHaveBeenCalledWith(Screens.CODE, expect.objectContaining({
            code,
            codeIsSerialized: true,
        }));
    });
});
