// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

export const SnackBarContext = React.createContext(0);

export const SnackBarProvider = ({postInputTop, children}: any) => {
    return (
        <SnackBarContext.Provider value={postInputTop}>
            {children}
        </SnackBarContext.Provider>
    );
};

export function useSnackBar(): number {
    return React.useContext(SnackBarContext);
}
