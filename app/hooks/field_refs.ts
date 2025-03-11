// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRef, useCallback} from 'react';

import {type FloatingTextInputRef} from '@components/floating_text_input_label';

const useFieldRefs = (): [(key: string) => FloatingTextInputRef | undefined, (key: string) => (providedRef: FloatingTextInputRef) => () => void] => {
    const allRefs = useRef<Map<string, FloatingTextInputRef>>();

    const getAllRefs = useCallback(() => {
        if (!allRefs.current) {
            allRefs.current = new Map();
        }
        return allRefs.current;
    },
    []);

    const setRef = useCallback(
        (key: string) => {
            return (providedRef: FloatingTextInputRef) => {
                const refs = getAllRefs();
                refs.set(key, providedRef);

                return () => {
                    refs.delete(key);
                };
            };
        },
        [getAllRefs]);

    const getRef = useCallback((key: string): FloatingTextInputRef | undefined => {
        const refs = getAllRefs();
        return refs.get(key);
    },
    [getAllRefs]);

    return [getRef, setRef];
};

export default useFieldRefs;
