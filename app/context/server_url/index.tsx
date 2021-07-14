// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ComponentType, createContext} from 'react';

type Props = {
    url: string;
    children: React.ReactNode;
}

type WithServerUrlProps = {
    serverUrl: string;
}

const ServerUrlContext = createContext<string>('');
const {Provider, Consumer} = ServerUrlContext;

function ServerUrlProvider({url, children}: Props) {
    return (
        <Provider value={url}>{children}</Provider>
    );
}

export function withServerUrl<T extends WithServerUrlProps>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerUrlComponent(props) {
        return (
            <Consumer>
                {(serverUrl: string) => (
                    <Component
                        {...props}
                        serverUrl={serverUrl}
                    />
                )}
            </Consumer>
        );
    };
}

export function useServerUrl(): string {
    return React.useContext(ServerUrlContext);
}

export default ServerUrlProvider;
