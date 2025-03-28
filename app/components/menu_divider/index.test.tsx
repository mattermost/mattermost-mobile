// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';

import MenuDivider from './index';

describe('components/menu_divider', () => {
    const theme = Preferences.THEMES.denim;

    it('should render divider with default margins', () => {
        const {root} = render(<MenuDivider/>);

        expect(root).toHaveStyle({
            marginTop: 8,
            marginBottom: 8,
            marginLeft: 0,
            marginRight: 0,
        });
    });

    it('should render divider with custom margins', () => {
        const margins = {
            marginTop: 16,
            marginBottom: 24,
            marginLeft: 12,
            marginRight: 13,
        };

        const {root} = render(<MenuDivider {...margins}/>);

        expect(root).toHaveStyle({
            marginTop: 16,
            marginBottom: 24,
            marginLeft: 12,
            marginRight: 13,
        });
    });

    it('should apply correct theme styles', () => {
        const {root} = render(<MenuDivider/>);

        expect(root).toHaveStyle({
            backgroundColor: theme.centerChannelColor,
            height: 1,
            opacity: 0.08,
        });
    });
});
