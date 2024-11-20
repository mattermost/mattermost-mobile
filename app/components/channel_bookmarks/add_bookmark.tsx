// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, View, type Insets} from 'react-native';

import Button from '@components/button';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {BOTTOM_SHEET_ANDROID_OFFSET, TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet, showModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';

import AddBookmarkOptions from './add_bookmark_options';

type Props = {
    bookmarksCount: number;
    canUploadFiles: boolean;
    channelId: string;
    currentUserId: string;
    showLarge: boolean;
}

const MAX_BOOKMARKS_PER_CHANNEL = 50;
const hitSlop: Insets = {top: 10, bottom: 10, left: 10, right: 10};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    largeButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 32,
        paddingHorizontal: 8,
        paddingVertical: 0,
        borderRadius: 16,
    },
    largeButtonText: {
        color: theme.centerChannelColor,
        lineHeight: undefined,
        marginTop: undefined,
        ...typography('Body', 100, 'SemiBold'),
        paddingRight: 6,
    },
    largeButtonIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingRight: 4,
        paddingTop: 3,
    },
    smallButton: {
        backgroundColor: undefined,
        paddingHorizontal: undefined,
        paddingVertical: undefined,
        alignItems: 'flex-end',
        justifyContent: 'center',
        margin: undefined,
        top: 3,
        right: 0,
    },
    smallButtonText: {
        color: theme.centerChannelColor,
        lineHeight: undefined,
        marginTop: undefined,
        ...typography('Body', 100, 'SemiBold'),
        marginRight: undefined,
        padding: undefined,
    },
    smallButtonIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
}));

const AddBookmark = ({bookmarksCount, channelId, currentUserId, canUploadFiles, showLarge}: Props) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();
    const styles = getStyleSheet(theme);

    const onPress = useCallback(() => {
        if (bookmarksCount >= MAX_BOOKMARKS_PER_CHANNEL) {
            Alert.alert(
                formatMessage({id: 'channel_info.add_bookmark', defaultMessage: 'Add a bookmark'}),
                formatMessage({
                    id: 'channel_info.add_bookmark.max_reached',
                    defaultMessage: 'This channel has reached the maximum number of bookmarks ({count}).',
                }, {count: MAX_BOOKMARKS_PER_CHANNEL}),
            );
            return;
        }

        if (!canUploadFiles) {
            const title = formatMessage({id: 'screens.channel_bookmark_add', defaultMessage: 'Add a bookmark'});
            const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
            const closeButtonId = 'close-channel-bookmark-add';

            const options = {
                topBar: {
                    leftButtons: [{
                        id: closeButtonId,
                        icon: closeButton,
                        testID: 'close.channel_bookmark_add.button',
                    }],
                },
            };
            showModal(Screens.CHANNEL_BOOKMARK, title, {
                channelId,
                closeButtonId,
                type: 'link',
                ownerId: currentUserId,
            }, options);
            return;
        }

        const renderContent = () => (
            <AddBookmarkOptions
                channelId={channelId}
                currentUserId={currentUserId}
            />
        );

        let height = bottomSheetSnapPoint(1, (2 * ITEM_HEIGHT)) + TITLE_HEIGHT;
        if (Platform.OS === 'android') {
            height += BOTTOM_SHEET_ANDROID_OFFSET;
        }

        bottomSheet({
            title: formatMessage({id: 'channel_info.add_bookmark', defaultMessage: 'Add a bookmark'}),
            renderContent,
            snapPoints: [1, height],
            theme,
            closeButtonId: 'close-channel-quick-actions',
        });
    }, [bookmarksCount, canUploadFiles, formatMessage, theme, channelId, currentUserId]);

    const button = (
        <Button
            backgroundStyle={showLarge ? styles.largeButton : styles.smallButton}
            onPress={onPress}
            hitSlop={hitSlop}
            text={showLarge ? formatMessage({id: 'channel_info.add_bookmark', defaultMessage: 'Add a bookmark'}) : ''}
            textStyle={showLarge ? styles.largeButtonText : styles.smallButtonText}
            theme={theme}
            iconComponent={
                <CompassIcon
                    name='plus'
                    size={showLarge ? 16 : 20}
                    style={showLarge ? styles.largeButtonIcon : styles.smallButtonIcon}
                />
            }
        />
    );

    if (showLarge) {
        return (<View style={styles.container}>{button}</View>);
    }

    return button;
};

export default AddBookmark;
