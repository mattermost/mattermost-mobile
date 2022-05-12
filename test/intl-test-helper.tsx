// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';
import {render} from '@testing-library/react-native';
import React, {ReactElement} from 'react';
import {createIntl, IntlProvider} from 'react-intl';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {ThemeContext, getDefaultThemeByAppearance} from '@context/theme';
import {getTranslations} from '@i18n';

import type Database from '@nozbe/watermelondb/Database';

export function getIntlShape(locale = 'en') {
    return createIntl({
        locale,
        messages: getTranslations(locale),
    });
}

export function renderWithIntl(ui: ReactElement, {locale = 'en', ...renderOptions} = {}) {
    function Wrapper({children}: {children: ReactElement}) {
        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                <SafeAreaProvider>
                    {children}
                </SafeAreaProvider>
            </IntlProvider>
        );
    }

    return render(ui, {wrapper: Wrapper, ...renderOptions});
}

export function renderWithIntlAndTheme(ui: ReactElement, {locale = 'en', ...renderOptions} = {}) {
    function Wrapper({children}: {children: ReactElement}) {
        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                <ThemeContext.Provider value={getDefaultThemeByAppearance()}>
                    <SafeAreaProvider>
                        {children}
                    </SafeAreaProvider>
                </ThemeContext.Provider>
            </IntlProvider>
        );
    }

    return render(ui, {wrapper: Wrapper, ...renderOptions});
}

export function renderWithEverything(ui: ReactElement, {locale = 'en', database, ...renderOptions}: {locale?: string; database?: Database; renderOptions?: any} = {}) {
    function Wrapper({children}: {children: ReactElement}) {
        if (!database) {
            return null;
        }

        return (
            <DatabaseProvider database={database}>
                <IntlProvider
                    locale={locale}
                    messages={getTranslations(locale)}
                >
                    <ThemeContext.Provider value={getDefaultThemeByAppearance()}>
                        <SafeAreaProvider>
                            {children}
                        </SafeAreaProvider>
                    </ThemeContext.Provider>
                </IntlProvider>
            </DatabaseProvider>
        );
    }

    return render(ui, {wrapper: Wrapper, ...renderOptions});
}

// eslint-disable-next-line no-duplicate-imports
export * from '@testing-library/react-native';
