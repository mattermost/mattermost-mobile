// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, type ListRenderItemInfo, type StyleProp, View, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Single from './single';

type Props = {
    files: SharedItem[];
    maxFileSize: number;
    theme: Theme;
};

const getKey = (item: SharedItem) => item.value;

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    first: {
        marginLeft: 20,
    },
    item: {
        marginRight: 12,
    },
    last: {
        marginRight: 20,
    },
    list: {
        height: 114,
        top: -8,
        width: '100%',
    },
    container: {
        alignItems: 'flex-end',
    },
    labelContainer: {
        alignItems: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 20,
        width: '100%',
    },
    label: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 75),
    },
}));

const Multiple = ({files, maxFileSize, theme}: Props) => {
    const styles = getStyles(theme);
    const count = useMemo(() => ({count: files.length}), [files.length]);

    const renderItem = useCallback(({item, index}: ListRenderItemInfo<SharedItem>) => {
        const containerStyle: StyleProp<ViewStyle> = [styles.item];
        if (index === 0) {
            containerStyle.push(styles.first);
        } else if (index === files.length - 1) {
            containerStyle.push(styles.last);
        }
        return (
            <View style={containerStyle}>
                <Single
                    file={item}
                    isSmall={true}
                    maxFileSize={maxFileSize}
                    theme={theme}
                />
            </View>
        );
    }, [maxFileSize, theme, files]);

    return (
        <>
            <FlatList
                data={files}
                horizontal={true}
                keyExtractor={getKey}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={styles.container}
                overScrollMode='always'
            />
            <View style={styles.labelContainer}>
                <FormattedText
                    id='share_extension.multiple_label'
                    defaultMessage='{count, number} attachments'
                    values={count}
                    style={styles.label}
                />
            </View>
        </>
    );
};

export default Multiple;
