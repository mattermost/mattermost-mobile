// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ComponentType, createContext} from 'react';

type Props = {
    server: ServerContext;
    children: React.ReactNode;
}

type WithServerUrlProps = {
    serverUrl: string;
}

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

export function withServerUrl<T extends WithServerUrlProps>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerUrlComponent(props) {
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
