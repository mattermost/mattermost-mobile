// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    data: any;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.buttonBg,
        marginHorizontal: 8,
        width: 10,
    },
}));

const Paginator = ({theme, data}: Props) => {
    const styles = getStyleSheet(theme);

    return (
        <View style={{flexDirection: 'row', height: 64}}>
            {data.map((item: any) => {
                return (
                    <View
                        style={[styles.dot]}
                        key={item.id}
                    />
                );
            })}
        </View>
    );
};

export default Paginator;
