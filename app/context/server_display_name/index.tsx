// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ComponentType, createContext} from 'react';

type Props = {
    displayName: string;
    children: React.ReactNode;
}

type WithServerDisplayNameProps = {
    serverDisplayName: string;
}

const ServerDisplayNameContext = createContext<string>('');
const {Provider, Consumer} = ServerDisplayNameContext;

function ServerDisplayNameProvider({displayName, children}: Props) {
    return (
        <Provider value={displayName}>{children}</Provider>
    );
}

export function withServerDisplayName<T extends WithServerDisplayNameProps>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerDisplayNameComponent(props) {
        return (
            <Consumer>
                {(serverDisplayName: string) => (
                    <Component
                        {...props}
                        serverDisplayName={serverDisplayName}
                    />
                )}
            </Consumer>
        );
    };
}

export function useServerDisplayName(): string {
    return React.useContext(ServerDisplayNameContext);
}

export default ServerDisplayNameProvider;
