// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, type StyleProp, View, type ViewStyle} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    isSaved: boolean;
    repliesCount: number;
    rootId: string;
    rootPost?: PostModel;
    testID: string;
    style?: StyleProp<ViewStyle>;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            flexDirection: 'row',
            marginVertical: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
        },
        repliesCountContainer: {
            flex: 1,
        },
        repliesCount: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            marginHorizontal: 4,
            ...typography('Body', 200, 'Regular'),
        },
        optionsContainer: {
            flexDirection: 'row',
        },
        optionContainer: {
            marginLeft: 16,
        },
    };
});

const ThreadOverview = ({isSaved, repliesCount, rootPost, style, testID}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const intl = useIntl();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const onHandleSavePress = useCallback(preventDoubleTap(() => {
        if (rootPost?.id) {
            const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
            remoteAction(serverUrl, rootPost.id);
        }
    }), [isSaved, rootPost, serverUrl]);

    const showPostOptions = useCallback(preventDoubleTap(() => {
        Keyboard.dismiss();
        if (rootPost?.id) {
            const passProps = {sourceScreen: Screens.THREAD, post: rootPost, showAddReaction: true};
            const title = isTablet ? intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}) : '';

            if (isTablet) {
                showModal(Screens.POST_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-post-options'));
            } else {
                showModalOverCurrentContext(Screens.POST_OPTIONS, passProps, bottomSheetModalOptions(theme));
            }
        }
    }), [rootPost]);

    const containerStyle = useMemo(() => {
        const container: StyleProp<ViewStyle> = [styles.container];
        if (repliesCount === 0) {
            container.push({
                borderBottomWidth: 0,
            });
        }
        container.push(style);
        return container;
    }, [repliesCount, style]);

    const saveButtonTestId = isSaved ? `${testID}.unsave.button` : `${testID}.save.button`;

    if (repliesCount === 0) {
        return null;
    }

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <View style={styles.repliesCountContainer}>
                <FormattedText
                    style={styles.repliesCount}
                    id='thread.repliesCount'
                    defaultMessage='{repliesCount, number} {repliesCount, plural, one {reply} other {replies}}'
                    testID={`${testID}.replies_count`}
                    values={{repliesCount}}
                />
            </View>
            <View style={styles.optionsContainer}>
                <TouchableOpacity
                    onPress={onHandleSavePress}
                    style={styles.optionContainer}
                    testID={saveButtonTestId}
                >
                    <CompassIcon
                        size={24}
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        color={isSaved ? theme.linkColor : changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={showPostOptions}
                    style={styles.optionContainer}
                    testID={`${testID}.post_options.button`}
                >
                    <CompassIcon
                        size={24}
                        name={Platform.select({android: 'dots-vertical', default: 'dots-horizontal'})}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ThreadOverview;
