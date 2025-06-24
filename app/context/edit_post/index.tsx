// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, useMemo, type ReactNode} from 'react';

type EditPostContextType = {
    onFileRemove?: (fileId: string) => void;
    updateFileCallback?: (fileInfo: FileInfo) => void;
    isEditMode: boolean;
};

const EditPostContext = createContext<EditPostContextType>({
    onFileRemove: undefined,
    updateFileCallback: undefined,
    isEditMode: false,
});

type EditPostProviderProps = {
    children: ReactNode;
    onFileRemove?: (fileId: string) => void;
    updateFileCallback?: (fileInfo: FileInfo) => void;
    isEditMode: boolean;
};

export const EditPostProvider = ({children, onFileRemove, updateFileCallback, isEditMode}: EditPostProviderProps) => {
    const contextValue = useMemo(() => ({
        onFileRemove,
        updateFileCallback,
        isEditMode,
    }), [onFileRemove, updateFileCallback, isEditMode]);

    return (
        <EditPostContext.Provider value={contextValue}>
            {children}
        </EditPostContext.Provider>
    );
};

export const useEditPost = () => {
    return useContext(EditPostContext);
};
