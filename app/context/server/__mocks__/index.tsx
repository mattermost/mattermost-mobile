// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Manual mock for @context/server. Suites that automock the module
// (jest.mock('@context/server')) would otherwise turn withServerUrl into a
// jest.fn returning undefined, which crashes any module composing HOCs at
// import time (e.g. withDatabase(withServerUrl(...))). Keep withServerUrl a
// working HOC that injects the mockable useServerUrl value.

import React from 'react';

type WithServerUrlProps = {
    serverUrl: string;
}

type GetProps<C> = C extends React.ComponentType<infer P & WithServerUrlProps> ? P : never

export const useServerUrl = jest.fn((): string => 'https://server.example.com');

export const useServerDisplayName = jest.fn((): string => 'server');

export function withServerUrl<C extends React.ComponentType<P>, P = GetProps<C>>(Component: C) {
    return function WithServerUrl(props: React.JSX.LibraryManagedAttributes<C, P>) {
        return (
            <Component
                {...props}
                serverUrl={useServerUrl()}
            />
        );
    };
}

const ServerUrlProvider = ({children}: {children: React.ReactNode}) => (
    <>{children}</>
);

export default ServerUrlProvider;
