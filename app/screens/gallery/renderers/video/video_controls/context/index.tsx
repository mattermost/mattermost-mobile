// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useState, type ReactNode} from 'react';

import type {View} from 'react-native';

export type ViewPosition = {
    x: number;
    y: number;
    width: number;
    height: number;
    ref: React.RefObject<View>;
};

type ViewPositionContextType = {
    viewPosition: ViewPosition | null;
    setViewPosition: (position: ViewPosition | null) => void;
};

const ViewPositionContext = createContext<ViewPositionContextType | undefined>(undefined);

export const useViewPosition = (): ViewPositionContextType => {
    const context = React.useContext(ViewPositionContext);
    if (!context) {
        throw new Error('useViewPosition must be used within a ViewPositionProvider');
    }
    return context;
};

type Props = {
    children: ReactNode;
};

export const ViewPositionProvider: React.FC<Props> = ({children}) => {
    const [viewPosition, setViewPosition] = useState<ViewPosition | null>(null);

    return (
        <ViewPositionContext.Provider value={{viewPosition, setViewPosition}}>
            {children}
        </ViewPositionContext.Provider>
    );
};
