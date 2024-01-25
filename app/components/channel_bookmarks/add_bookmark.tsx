// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import BookmarkType from '@components/channel_bookmarks/bookmark_type';
import FormattedText from '@components/formatted_text';
import {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet, showModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';

type Props = {
    bookmarksCount: number;
    canUploadFiles: boolean;
    channelId: string;
    currentUserId: string;
    showLarge: boolean;
    showInInfo: boolean;
}

const MAX_BOOKMARKS_PER_CHANNEL = 50;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    flex: {flex: 1},
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
        marginRight: 16,
    },
    largeButtonIcon: {
        color: theme.centerChannelColor,
        paddingRight: 6,
        marginTop: 3,
    },
    listHeader: {
        marginBottom: 12,
    },
    listHeaderText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    smallButton: {
        backgroundColor: undefined,
        paddingHorizontal: undefined,
        paddingVertical: undefined,
        alignItems: 'center',
        justifyContent: 'center',
        margin: undefined,
        height: 32,
        top: 3,
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
    info: {
        height: 32,
        width: 32,
    },
}));

const AddBookmark = ({bookmarksCount, channelId, currentUserId, canUploadFiles, showInInfo, showLarge}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {formatMessage} = useIntl();
    const {bottom} = useSafeAreaInsets();
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
            showModal(Screens.CHANNEL_BOOKMARK_ADD, title, {
                channelId,
                closeButtonId,
                type: 'link',
                ownerId: currentUserId,
            }, options);
            return;
        }

        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={styles.listHeader}>
                        <FormattedText
                            id='channel_info.add_bookmark'
                            defaultMessage={'Add a bookmark'}
                            style={styles.listHeaderText}
                        />
                    </View>
                )}
                <View style={styles.flex}>
                    <BookmarkType
                        channelId={channelId}
                        type='link'
                        ownerId={currentUserId}
                    />
                    <BookmarkType
                        channelId={channelId}
                        type='file'
                        ownerId={currentUserId}
                    />
                </View>
            </>
        );

        bottomSheet({
            title: formatMessage({id: 'channel_info.add_bookmark', defaultMessage: 'Add a bookmark'}),
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, (2 * ITEM_HEIGHT), bottom) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'close-channel-quick-actions',
        });
    }, [bottom, bookmarksCount, canUploadFiles, currentUserId, channelId]);

    if (showLarge) {
        return (
            <View style={styles.container}>
                <Button
                    backgroundStyle={styles.largeButton}
                    onPress={onPress}
                    text={formatMessage({id: 'channel_info.add_bookmark', defaultMessage: 'Add a bookmark'})}
                    textStyle={styles.smallButtonText}
                    theme={theme}
                    iconComponent={
                        <CompassIcon
                            name='plus'
                            size={16}
                            style={styles.largeButtonIcon}
                        />
                    }
                />
            </View>
        );
    }

    return (
        <Button
            backgroundStyle={[styles.smallButton, showInInfo && styles.info]}
            onPress={onPress}
            text={''}
            textStyle={styles.smallButtonText}
            theme={theme}
            iconComponent={
                <CompassIcon
                    name='plus'
                    size={18}
                    style={styles.smallButtonIcon}
                />
            }
        />
    );
};

export default AddBookmark;
