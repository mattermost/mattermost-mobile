// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import Emoji from '@components/emoji';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channelId: string;
    createdAt: number;
    createdBy: string;
    customStatus?: UserCustomStatus;
    header?: string;
}

const headerMetadata = {header: {width: 1, height: 1}};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginBottom: 20,
    },
    item: {
        marginTop: 16,
    },
    extraHeading: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 8,
        ...typography('Body', 75),
    },
    header: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
        fontWeight: undefined,
    },
    created: {
        color: changeOpacity(theme.centerChannelColor, 0.48),
        ...typography('Body', 75),
    },
    customStatus: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    customStatusEmoji: {
        marginRight: 10,
    },
    customStatusLabel: {
        color: theme.centerChannelColor,
        marginRight: 8,
        ...typography('Body', 200),
    },
    customStatusExpiry: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
}));

const Extra = ({channelId, createdAt, createdBy, customStatus, header}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const created = useMemo(() => ({
        user: createdBy,
        date: (
            <FormattedDate
                style={styles.created}
                value={createdAt}
            />
        ),
    }), [createdAt, createdBy, theme]);

    return (
        <View style={styles.container}>
            {Boolean(customStatus) &&
            <View style={styles.item}>
                <FormattedText
                    id='channel_info.custom_status'
                    defaultMessage='Custom status:'
                    style={styles.extraHeading}
                />
                <View style={styles.customStatus}>
                    {Boolean(customStatus?.emoji) &&
                    <View style={styles.customStatusEmoji}>
                        <Emoji
                            emojiName={customStatus!.emoji!}
                            size={24}
                        />
                    </View>
                    }
                    {Boolean(customStatus?.text) &&
                    <Text style={styles.customStatusLabel}>
                        {customStatus?.text}
                    </Text>
                    }
                    {Boolean(customStatus?.duration) &&
                    <CustomStatusExpiry
                        time={moment(customStatus?.expires_at)}
                        theme={theme}
                        textStyles={styles.customStatusExpiry}
                        withinBrackets={false}
                        showPrefix={true}
                        showToday={true}
                        showTimeCompulsory={false}
                    />
                    }
                </View>
            </View>
            }
            {Boolean(header) &&
            <View style={styles.item}>
                <FormattedText
                    id='channel_info.header'
                    defaultMessage='Header:'
                    style={styles.extraHeading}
                />
                <Markdown
                    channelId={channelId}
                    baseTextStyle={styles.header}
                    blockStyles={blockStyles}
                    disableBlockQuote={true}
                    disableCodeBlock={true}
                    disableGallery={true}
                    disableHeading={true}
                    disableTables={true}
                    location={Screens.CHANNEL_INFO}
                    textStyles={textStyles}
                    layoutHeight={48}
                    layoutWidth={100}
                    theme={theme}
                    imagesMetadata={headerMetadata}
                    value={header}
                />
            </View>
            }
            {Boolean(createdAt && createdBy) &&
            <View style={styles.item}>
                <FormattedText
                    id='channel_intro.createdBy'
                    defaultMessage='Created by {user} on {date}'
                    style={styles.created}
                    values={created}
                />
            </View>
            }
            {Boolean(createdAt && !createdBy) &&
            <View style={styles.item}>
                <FormattedText
                    id='channel_intro.createdOn'
                    defaultMessage='Created on {date}'
                    style={styles.created}
                    values={created}
                />
            </View>
            }
        </View>
    );
};

export default Extra;
