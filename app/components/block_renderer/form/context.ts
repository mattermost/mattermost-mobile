// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createContext, useContext} from 'react';

import type {MmBlocksFormContextValue} from './types';

export const MmBlocksFormContext = createContext<MmBlocksFormContextValue | null>(null);

export function useMmBlocksForm(): MmBlocksFormContextValue {
    const ctx = useContext(MmBlocksFormContext);
    if (!ctx) {
        throw new Error('useMmBlocksForm must be used within MmBlocksForm');
    }
    return ctx;
}
