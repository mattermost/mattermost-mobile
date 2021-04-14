// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, TextStyle, View, ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {Theme} from '@mm-redux/types/preferences';
import {MessageAttachmentField} from '@mm-redux/types/message_attachments';
import {PostMetadata} from '@mm-redux/types/posts';

type Props = {
    baseTextStyle: StyleProp<TextStyle>,
    blockStyles?: StyleProp<ViewStyle>[],
    fields?: MessageAttachmentField[],
    metadata?: PostMetadata,
    onPermalinkPress?: () => void,
    textStyles?: StyleProp<TextStyle>[],
    theme: Theme,
}

export default function AttachmentFields(props: Props) {
    const {
        baseTextStyle,
        blockStyles,
        fields,
        metadata,
        onPermalinkPress,
        textStyles,
        theme,
    } = props;

    if (!fields?.length) {
        return null;
    }

    const style = getStyleSheet(theme);
    const fieldTables = [];

    let fieldInfos = [] as React.ReactNode[];
    let rowPos = 0;
    let lastWasLong = false;
    let nrTables = 0;

    fields.forEach((field, i) => {
        if (rowPos === 2 || !(field.short === true) || lastWasLong) {
            fieldTables.push(
                <View
                    key={`attachment__table__${nrTables}`}
                    style={style.field}
                >
                    {fieldInfos}
                </View>,
            );
            fieldInfos = [];
            rowPos = 0;
            nrTables += 1;
            lastWasLong = false;
        }

        fieldInfos.push(
            <View
                style={style.flex}
                key={`attachment__field-${i}__${nrTables}`}
            >
                {Boolean(field.title) && (
                    <View
                        style={style.headingContainer}
                        key={`attachment__field-caption-${i}__${nrTables}`}
                    >
                        <View>
                            <Text style={style.heading}>
                                {field.title}
                            </Text>
                        </View>
                    </View>
                )}
                <View
                    style={style.flex}
                    key={`attachment__field-${i}__${nrTables}`}
                >
                    <Markdown

                        //TODO: remove conversion when markdown is migrated to typescript
                        baseTextStyle={baseTextStyle as any}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        disableGallery={true}
                        imagesMetadata={metadata?.images}
                        value={(field.value || '')}
                        onPermalinkPress={onPermalinkPress}
                    />
                </View>
            </View>,
        );

        rowPos += 1;
        lastWasLong = !(field.short === true);
    });

    if (fieldInfos.length > 0) { // Flush last fields
        fieldTables.push(
            <View
                key={`attachment__table__${nrTables}`}
                style={style.table}
            >
                {fieldInfos}
            </View>,
        );
    }

    return (
        <View>
            {fieldTables}
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        field: {
            alignSelf: 'stretch',
            flexDirection: 'row',
        },
        flex: {
            flex: 1,
        },
        headingContainer: {
            alignSelf: 'stretch',
            flexDirection: 'row',
            marginBottom: 5,
            marginTop: 10,
        },
        heading: {
            color: theme.centerChannelColor,
            fontWeight: '600',
        },
        table: {
            flex: 1,
            flexDirection: 'row',
        },
    };
});
