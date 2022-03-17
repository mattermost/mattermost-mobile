// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

export const PostInputTopContext = React.createContext(0);

export const PostInputTopProvider = ({postInputTop, children}: any) => {
    return (
        <PostInputTopContext.Provider value={postInputTop}>
            {children}
        </PostInputTopContext.Provider>
    );
};

export function usePostInputTop(): number {
    return React.useContext(PostInputTopContext);
}
