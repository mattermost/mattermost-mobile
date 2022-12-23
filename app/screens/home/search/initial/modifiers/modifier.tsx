// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Dispatch, RefObject, SetStateAction, useCallback} from 'react';
import {StyleSheet} from 'react-native';

import OptionItem from '@components/option_item';
import {SearchRef} from '@components/search';
import {preventDoubleTap} from '@utils/tap';

const styles = StyleSheet.create({
    container: {
        marginLeft: 20,
    },
});

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
    const handlePress = useCallback(() => {
        addModifierTerm(item.term);
    }, [item.term, searchValue]);

    const addModifierTerm = preventDoubleTap((modifierTerm) => {
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
            setTimeout(() => {
                searchRef.current?.setNativeProps({selection: {start: position, end: position}});
            }, 50);
        }
    });

    return (
        <OptionItem
            action={handlePress}
            icon={'plus-box-outline'}
            inline={true}
            label={item.term}
            testID={item.testID}
            description={' ' + item.description}
            type='default'
            containerStyle={styles.container}
        />
    );
};

export default Modifier;
