// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, ReactNode} from 'react';
import {StyleSheet, Text, TextStyle, View} from 'react-native';

type MarkdownListItemProps = {
    bulletStyle: TextStyle;
    bulletWidth: number;
    children: ReactNode | ReactNode[];
    doContinue: boolean;
    index: number;
    isOrdered: boolean;
    level: number;
}

const MarkdownListItem = ({index, level, bulletWidth, bulletStyle, children, doContinue, isOrdered}: MarkdownListItemProps) => {
    let bullet;
    if (doContinue) {
        bullet = '';
    } else if (isOrdered) {
        bullet = index + '.';
    } else if (level % 2 === 0) {
        bullet = '◦';
    } else {
        bullet = '•';
    }

    return (
        <View style={style.container}>
            <View style={[{width: bulletWidth}, style.bullet]}>
                <Text style={bulletStyle}>
                    {bullet}
                </Text>
            </View>
            <View style={style.contents}>
                {children}
            </View>
        </View>
    );
};

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bullet: {
        alignItems: 'flex-end',
        marginRight: 5,
    },
    contents: {
        flex: 1,
    },
});

export default memo(MarkdownListItem);
