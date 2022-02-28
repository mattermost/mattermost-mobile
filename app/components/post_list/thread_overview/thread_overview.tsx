// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import FormattedText from '@app/components/formatted_text';
import {Screens} from '@app/constants';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    isSaved: boolean;
    repliesCount: number;
    rootPost: PostModel;
    testID: string;
    theme: Theme;
};

const ThreadOverview = ({isSaved, repliesCount, rootPost, testID, theme}: Props) => {
    const styles = getStyleSheet(theme);

    const intl = useIntl();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const onHandleSavePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        remoteAction(serverUrl, rootPost.id);
    }, [isSaved, rootPost.id, serverUrl]);

    const showPostOptions = useCallback(() => {
        Keyboard.dismiss();
        const passProps = {location: Screens.THREAD, post: rootPost, showAddReaction: true};
        const title = isTablet ? intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}) : '';

        if (isTablet) {
            showModal(Screens.POST_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-post-options'));
        } else {
            showModalOverCurrentContext(Screens.POST_OPTIONS, passProps);
        }
    }, [rootPost]);

    const containerStyle = [styles.container];
    if (repliesCount === 0) {
        containerStyle.push({
            borderBottomWidth: 0,
        });
    }

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <View style={styles.repliesCountContainer}>
                {
                    repliesCount > 0 ? (
                        <FormattedText
                            style={styles.repliesCount}
                            id='thread.repliesCount'
                            defaultMessage='{repliesCount, number} {repliesCount, plural, one {reply} other {replies}}'
                            values={{
                                repliesCount,
                            }}
                        />
                    ) : (
                        <FormattedText
                            style={styles.repliesCount}
                            id='thread.noReplies'
                            defaultMessage='No replies yet'
                            values={{
                                repliesCount,
                            }}
                        />
                    )
                }
            </View>
            <View style={styles.optionsContainer}>
                <TouchableWithFeedback
                    borderlessRipple={true}
                    onPress={onHandleSavePress}
                    rippleRadius={20}
                    style={styles.optionContainer}
                    type={Platform.select({android: 'native', default: 'opacity'})}
                    testID={'sometestId'}
                >
                    <CompassIcon
                        size={24}
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        color={isSaved ? theme.linkColor : changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </TouchableWithFeedback>
                <TouchableWithFeedback
                    borderlessRipple={true}
                    onPress={showPostOptions}
                    rippleRadius={20}
                    style={styles.optionContainer}
                    type={Platform.select({android: 'native', default: 'opacity'})}
                    testID={'sometestId'}
                >
                    <CompassIcon
                        size={24}
                        name={Platform.select({android: 'dots-vertical', default: 'dots-horizontal'})}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </TouchableWithFeedback>
            </View>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            flexDirection: 'row',
            marginVertical: 12,
            paddingHorizontal: 20,
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

export default ThreadOverview;
