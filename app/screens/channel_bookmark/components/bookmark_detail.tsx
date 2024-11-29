// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TextInput, View} from 'react-native';

import BookmarkIcon from '@components/channel_bookmarks/channel_bookmark/bookmark_icon';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {openAsBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    disabled: boolean;
    emoji?: string;
    file?: ExtractedFileInfo;
    imageUrl?: string;
    setBookmarkDisplayName: (displayName: string) => void;
    setBookmarkEmoji: (emoji?: string) => void;
    title: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        marginBottom: 8,
        ...typography('Heading', 100, 'SemiBold'),
    },
    container: {
        flexDirection: 'row',
    },
    disabled: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    iconContainer: {
        borderWidth: 1,
        paddingLeft: 16,
        paddingRight: 8,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRightWidth: 0,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    iconButton: {
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {width: 28, height: 28, marginRight: 2},
    image: {width: 24, height: 24},
    input: {
        borderBottomRightRadius: 4,
        borderTopRightRadius: 4,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 1,
        color: theme.centerChannelColor,
        ...typography('Body', 200),
        lineHeight: undefined,
    },
    genericBookmark: {
        alignSelf: 'center',
        top: 2,
    },
}));

const BookmarkDetail = ({disabled, emoji, file, imageUrl, setBookmarkDisplayName, setBookmarkEmoji, title}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const paddingStyle = useMemo(() => ({paddingHorizontal: isTablet ? 42 : 0}), [isTablet]);
    const styles = getStyleSheet(theme);

    const openEmojiPicker = useCallback(() => {
        openAsBottomSheet({
            closeButtonId: 'close-add-emoji',
            screen: Screens.EMOJI_PICKER,
            theme,
            title: intl.formatMessage({id: 'channel_bookmark.add.emoji', defaultMessage: 'Add emoji'}),
            props: {
                onEmojiPress: setBookmarkEmoji,
                imageUrl,
                file,
            },
        });
    }, [theme, intl, setBookmarkEmoji, imageUrl, file]);

    return (
        <View style={paddingStyle}>
            <FormattedText
                id='channel_bookmark.add.detail_title'
                defaultMessage='Title'
                style={styles.title}
            />
            <View style={[styles.container, disabled && styles.disabled]}>
                <Button
                    buttonStyle={styles.iconButton}
                    containerStyle={styles.iconContainer}
                    onPress={openEmojiPicker}
                >
                    <View style={styles.imageContainer}>
                        <BookmarkIcon
                            emoji={emoji}
                            emojiSize={22}
                            file={file}
                            genericStyle={styles.genericBookmark}
                            iconSize={30}
                            imageStyle={styles.image}
                            imageUrl={imageUrl}
                        />
                    </View>
                    <CompassIcon
                        size={12}
                        color={theme.centerChannelColor}
                        name='chevron-down'
                    />
                </Button>
                <TextInput
                    editable={!disabled}
                    onChangeText={setBookmarkDisplayName}
                    value={title}
                    style={styles.input}
                />
            </View>
        </View>
    );
};

export default BookmarkDetail;
