// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    divider: {
        backgroundColor: theme.centerChannelColor,
        height: 1,
        opacity: 0.08,
    },
}));

type Props = {
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
}

// Menu divider as per https://www.figma.com/design/ZV4NeVyUZoKfKRcRGyFJiT/Components---Mobile---Menu-Divider?node-id=1215-1535&t=qHU2DwCWm5cSbiq4-0
const MenuDivider = ({marginTop = 8, marginBottom = 8, marginLeft = 0, marginRight = 0}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const style = useMemo(() => [
        styles.divider,
        {marginTop, marginBottom, marginLeft, marginRight},
    ], [styles.divider, marginTop, marginBottom, marginLeft, marginRight]);

    return (<View style={style}/>);
};

export default MenuDivider;
