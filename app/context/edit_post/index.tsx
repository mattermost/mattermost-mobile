// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, useMemo, type ReactNode} from 'react';

type EditPostContextType = {
    onFileRemove?: (fileId: string) => void;
};

const EditPostContext = createContext<EditPostContextType>({});

type EditPostProviderProps = {
    children: ReactNode;
    onFileRemove?: (fileId: string) => void;
};

export const EditPostProvider = ({children, onFileRemove}: EditPostProviderProps) => {
    const contextValue = useMemo(() => ({
        onFileRemove,
    }), [onFileRemove]);

    return (
        <EditPostContext.Provider value={contextValue}>
            {children}
        </EditPostContext.Provider>
    );
};

export const useEditPost = () => {
    return useContext(EditPostContext);
};
