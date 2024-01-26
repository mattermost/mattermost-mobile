// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TextInput, View} from 'react-native';
import Button from 'react-native-button';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FileIcon from '@components/files/file_icon';
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
}));

const BookmarkDetail = ({disabled, emoji, file, imageUrl, setBookmarkDisplayName, setBookmarkEmoji, title}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const paddingStyle = useMemo(() => ({paddingHorizontal: isTablet ? 42 : 0}), [isTablet]);

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
    }, [imageUrl, file, theme, setBookmarkEmoji]);

    return (
        <View style={paddingStyle}>
            <FormattedText
                id='channel_bookmark.add.detail_title'
                defaultMessage='Title'
                style={styles.title}
            />
            <View style={[styles.container, disabled && styles.disabled]}>
                <Button
                    containerStyle={styles.iconContainer}
                    onPress={openEmojiPicker}
                >
                    <View style={styles.imageContainer}>
                        {Boolean(file) && !emoji &&
                        <FileIcon
                            file={file as FileInfo}
                            iconSize={30}
                            smallImage={true}
                        />
                        }
                        {Boolean(imageUrl) && !emoji &&
                        <FastImage
                            source={{uri: imageUrl}}
                            style={styles.image}
                        />
                        }
                        {Boolean(emoji) &&
                        <Emoji
                            emojiName={emoji!}
                            size={22}
                        />
                        }
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
