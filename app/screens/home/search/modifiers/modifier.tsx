// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';

import OptionItem from '@components/option_item';
import {preventDoubleTap} from '@utils/tap';

const styles = StyleSheet.create({
    container: {
        marginLeft: 20,
    },
});

export type ModifierItem = {
        description: string;
        testID: string;
        term: string;
}

type Props = {
    item: ModifierItem;
    setSearchValue: (value: string) => void;
    searchValue?: string;
}

const Modifier = ({item, searchValue, setSearchValue}: Props) => {
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
