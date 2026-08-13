// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useRef, useState} from 'react';
import {View} from 'react-native';

type TutorialContextType = {
    rootRef: React.RefObject<View | null>;
    rootOffset: number;
    measureRootOffset: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
    rootRef: {current: null},
    rootOffset: 0,
    measureRootOffset: () => undefined,
});

export const TutorialProvider = ({children}: {children: React.ReactNode}) => {
    const rootRef = useRef<View>(null);
    const [rootOffset, setRootOffset] = useState(0);

    const measureRootOffset = useCallback(() => {
        rootRef.current?.measureInWindow((_x, y) => {
            setRootOffset(y);
        });
    }, []);

    return (
        <TutorialContext.Provider value={{rootRef, rootOffset, measureRootOffset}}>
            <View
                ref={rootRef}
                style={{flex: 1}}
                collapsable={false}
                onLayout={measureRootOffset}
            >
                {children}
            </View>
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => useContext(TutorialContext);
