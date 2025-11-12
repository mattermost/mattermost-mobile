// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, type ReactNode} from 'react';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type {SharedValue} from 'react-native-reanimated';

interface KeyboardAnimationContextType {
    height: SharedValue<number>;
    inset: SharedValue<number>;
    offset: SharedValue<number>;
    keyboardHeight: SharedValue<number>;
    scroll: SharedValue<number>;
    onScroll: (event: unknown) => void;
    postInputContainerHeight: number;
    inputRef: React.MutableRefObject<PasteInputRef | undefined>;
    blurInput: () => void;
    focusInput: () => void;
    blurAndDismissKeyboard: () => Promise<void>;
}

const KeyboardAnimationContext = createContext<KeyboardAnimationContextType | null>(null);

export const KeyboardAnimationProvider = ({
    children,
    value,
}: {
    children: ReactNode;
    value: KeyboardAnimationContextType;
}) => {
    return (
        <KeyboardAnimationContext.Provider value={value}>
            {children}
        </KeyboardAnimationContext.Provider>
    );
};

export const useKeyboardAnimationContext = () => {
    const context = useContext(KeyboardAnimationContext);
    if (!context) {
        throw new Error('useKeyboardAnimationContext must be used within KeyboardAnimationProvider');
    }
    return context;
};

