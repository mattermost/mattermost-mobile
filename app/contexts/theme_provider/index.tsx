// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';

import {Preferences} from '@constants';

export const ThemeContext = React.createContext(Preferences.THEMES.default);

export const useTheme = () => {
    return useContext(ThemeContext);
};

export const ThemeProvider = ThemeContext.Provider;
