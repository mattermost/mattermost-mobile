// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, type ReactNode} from 'react';

type EditPostContextType = {
    onFileRemove?: (fileId: string) => void;
};

const EditPostContext = createContext<EditPostContextType>({});

type EditPostProviderProps = {
    children: ReactNode;
    onFileRemove?: (fileId: string) => void;
};

export const EditPostProvider = ({children, onFileRemove}: EditPostProviderProps) => {
    return (
        <EditPostContext.Provider value={{onFileRemove}}>
            {children}
        </EditPostContext.Provider>
    );
};

export const useEditPost = () => {
    return useContext(EditPostContext);
};
