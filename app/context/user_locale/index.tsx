// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React, {type ComponentType, createContext} from 'react';
import {IntlProvider} from 'react-intl';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {observeCurrentUser} from '@queries/servers/user';

import type Database from '@nozbe/watermelondb/Database';

type Props = {
    locale: string;
    children: React.ReactNode;
}

type WithUserLocaleProps = {
    locale: string;
}

export const UserLocaleContext = createContext(DEFAULT_LOCALE);
const {Consumer, Provider} = UserLocaleContext;

const UserLocaleProvider = ({locale, children}: Props) => {
    return (
        <Provider value={locale}>
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                {children}
            </IntlProvider>
        </Provider>);
};

export function withUserLocale<T extends WithUserLocaleProps>(Component: ComponentType<T>): ComponentType<T> {
    return function UserLocaleComponent(props) {
        return (
            <Consumer>
                {(locale: string) => (
                    <IntlProvider
                        locale={locale}
                        messages={getTranslations(locale)}
                    >
                        <Component
                            {...props}
                        />
                    </IntlProvider>
                )}
            </Consumer>
        );
    };
}

export function useUserLocale(): string {
    return React.useContext(UserLocaleContext);
}

const enhancedThemeProvider = withObservables([], ({database}: {database: Database}) => ({
    locale: observeCurrentUser(database).pipe(
        switchMap((user) => of$(user?.locale || DEFAULT_LOCALE)),
    ),
}));

export default enhancedThemeProvider(UserLocaleProvider);
