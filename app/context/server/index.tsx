// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext} from 'react';

type Props = {
    server: ServerContext;
    children: React.ReactNode;
}

type WithServerUrlProps = {
    serverUrl: string;
}

type GetProps<C> = C extends React.ComponentType<infer P & WithServerUrlProps> ? P : never

type ServerContext = {
    displayName: string;
    url: string;
}

const ServerContext = createContext<ServerContext>({displayName: '', url: ''});
const {Provider, Consumer} = ServerContext;

function ServerUrlProvider({server, children}: Props) {
    return (
        <Provider value={server}>{children}</Provider>
    );
}

export function withServerUrl<C extends React.ComponentType<P>, P = GetProps<C>>(Component: C) {
    return function ServerUrlComponent(props: JSX.LibraryManagedAttributes<C, P>) {
        return (
            <Consumer>
                {(server: ServerContext) => (
                    <Component
                        {...props}
                        serverUrl={server.url}
                    />
                )}
            </Consumer>
        );
    };
}

export function useServerDisplayName(): string {
    const server = React.useContext(ServerContext);
    return server.displayName;
}

export function useServerUrl(): string {
    const server = React.useContext(ServerContext);
    return server.url;
}

export default ServerUrlProvider;
