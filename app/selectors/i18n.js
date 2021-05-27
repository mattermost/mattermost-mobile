// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getLocales} from 'react-native-localize';

import {DEFAULT_LOCALE} from '@mm-redux/constants/general';
import {getCurrentUserLocale} from '@mm-redux/selectors/entities/i18n';

// Not a proper selector since the device locale isn't in the redux store
export function getCurrentLocale(state) {
    const deviceLocale = getLocales()[0].languageTag;
    const defaultLocale = deviceLocale || DEFAULT_LOCALE;

    return getCurrentUserLocale(state, defaultLocale);
}
