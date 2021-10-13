// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {ComponentType, createContext} from 'react';
import {IntlProvider} from 'react-intl';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';

import type {SystemModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    locale: string;
    children: React.ReactNode;
}

type WithUserLocaleProps = {
    locale: string;
}

const {SERVER: {USER, SYSTEM}} = MM_TABLES;

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
    locale: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value).pipe(
            // eslint-disable-next-line max-nested-callbacks
            switchMap((user) => of$(user.locale)),
        )),
        catchError(() => of$(DEFAULT_LOCALE)),
    ),
}));

export default enhancedThemeProvider(UserLocaleProvider);
