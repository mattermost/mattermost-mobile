// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import Block, {SectionText, BlockProps} from '@components/block';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        blockHeader: {
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
            marginBottom: 8,
            marginLeft: 20,
            marginTop: 12,
        },
        contentContainerStyle: {
            marginBottom: 0,
        },
    };
});

type SettingBlockProps = {
    children: React.ReactNode;
    headerText?: SectionText;
} & BlockProps;

const SettingBlock = ({headerText, ...props}: SettingBlockProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <Block
            headerText={headerText}
            headerStyles={styles.blockHeader}
            containerStyles={styles.contentContainerStyle}
            {...props}
        >

            {props.children}
        </Block>
    );
};

export default SettingBlock;
