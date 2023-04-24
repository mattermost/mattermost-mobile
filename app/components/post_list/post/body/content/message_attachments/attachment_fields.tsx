// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, Text, type TextStyle, View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
    blockStyles?: MarkdownBlockStyles;
    channelId: string;
    fields: MessageAttachmentField[];
    location: string;
    metadata?: PostMetadata | null;
    textStyles?: MarkdownTextStyles;
    theme: Theme;
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
            fontFamily: 'OpenSans-SemiBold',
        },
        table: {
            flex: 1,
            flexDirection: 'row',
        },
    };
});

const AttachmentFields = ({baseTextStyle, blockStyles, channelId, fields, location, metadata, textStyles, theme}: Props) => {
    const style = getStyleSheet(theme);
    const fieldTables = [];

    let fieldInfos: React.ReactNode[] = [];
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
                key={`attachment__field-${i.toString()}__${nrTables}`}
            >
                {Boolean(field.title) && (
                    <View
                        style={style.headingContainer}
                        key={`attachment__field-caption-${i.toString()}__${nrTables}`}
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
                    key={`attachment__field-${i.toString()}__${nrTables}`}
                >
                    <Markdown
                        baseTextStyle={baseTextStyle}
                        channelId={channelId}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        disableGallery={true}
                        imagesMetadata={metadata?.images}
                        location={location}
                        theme={theme}
                        value={(field.value || '')}
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
};

export default AttachmentFields;
