// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksChildLayoutContext} from './context';
import {DividerBlock} from './divider_block';

describe('DividerBlock', () => {
    const theme = Preferences.THEMES.denim;

    it('should render horizontal divider in column layout', () => {
        const {UNSAFE_getByType: getByType} = renderWithIntlAndTheme(
            <MmBlocksChildLayoutContext.Provider value='column'>
                <DividerBlock theme={theme}/>
            </MmBlocksChildLayoutContext.Provider>,
        );

        const divider = getByType(View);
        expect(divider.props.style).toEqual(expect.objectContaining({borderBottomWidth: 1}));
    });

    it('should render vertical divider in row layout', () => {
        const {UNSAFE_getByType: getByType} = renderWithIntlAndTheme(
            <MmBlocksChildLayoutContext.Provider value='row'>
                <DividerBlock theme={theme}/>
            </MmBlocksChildLayoutContext.Provider>,
        );

        const divider = getByType(View);
        expect(divider.props.style).toEqual(expect.objectContaining({borderLeftWidth: 1}));
    });
});
