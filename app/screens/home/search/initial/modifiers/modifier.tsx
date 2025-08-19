// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type Dispatch, type RefObject, type SetStateAction, useCallback} from 'react';

import OptionItem from '@components/option_item';
import {usePreventDoubleTap} from '@hooks/utils';

import type {SearchRef} from '@components/search';

export type ModifierItem = {
    cursorPosition?: number;
    description: string;
    testID: string;
    term: string;
}

type Props = {
    item: ModifierItem;
    setSearchValue: Dispatch<SetStateAction<string>>;
    searchValue?: string;
    searchRef: RefObject<SearchRef>;
}

const Modifier = ({item, searchRef, searchValue, setSearchValue}: Props) => {
    const setNativeCursorPositionProp = useCallback((position: number) => {
        setTimeout(() => {
            searchRef.current?.setCaretPosition({start: position, end: position});
        }, 50);

        // searchRef is a ref object, so its reference should not change between renders.
        // We add it to the dependencies to satisfy the linter.
    }, [searchRef]);

    const addModifierTerm = usePreventDoubleTap(useCallback((modifierTerm: string) => {
        let newValue = '';
        if (!searchValue) {
            newValue = modifierTerm;
        } else if (searchValue.endsWith(' ')) {
            newValue = `${searchValue}${modifierTerm}`;
        } else {
            newValue = `${searchValue} ${modifierTerm}`;
        }

        setSearchValue(newValue);
        if (item.cursorPosition) {
            const position = newValue.length + item.cursorPosition;
            setNativeCursorPositionProp(position);
        }
    }, [item.cursorPosition, searchValue, setNativeCursorPositionProp, setSearchValue]));

    const handlePress = useCallback(() => {
        addModifierTerm(item.term);
    }, [addModifierTerm, item.term]);

    return (
        <OptionItem
            action={handlePress}
            icon={'plus-box-outline'}
            inline={true}
            label={item.term}
            testID={item.testID}
            description={' ' + item.description}
            type='default'
        />
    );
};

export default Modifier;
