// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import {Text, View} from 'react-native';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import ProfilePicture from '@components/profile_picture';

import type {Theme} from '@mm-redux/types/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = (appTheme: Theme, size: number) => {
    const imgOverlap = -Math.floor(size * 0.4);
    return makeStyleSheetFromTheme((theme: Theme) => {
        return {
            container: {
                flexDirection: 'row',
            },
            notFirstAvatars: {
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: size * 0.01,
                borderColor: theme.centerChannelBg,
                backgroundColor: theme.centerChannelBg,
                borderRadius: (size) / 2,
                marginLeft: imgOverlap,
            },
            overflowContainer: {
                justifyContent: 'center',
                alignItems: 'center',
                width: size * 1.1,
                height: size * 1.1,
                borderRadius: (size * 1.1) / 2,
                borderWidth: (size * 1.1) * (size > 16 ? 0.04 : 0.03),
                borderColor: theme.centerChannelBg,
                backgroundColor: theme.centerChannelBg,
                marginLeft: imgOverlap,
            },
            overflowItem: {
                justifyContent: 'center',
                alignItems: 'center',
                width: size * 1.1,
                height: size * 1.1,
                borderRadius: (size * 1.1) / 2,
                borderWidth: (size * 1.1) * (size > 16 ? 0.04 : 0.03),
                borderColor: theme.centerChannelBg,
                backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            },
            overflowText: {
                fontSize: size * 0.4,
                color: changeOpacity(theme.centerChannelColor, 0.64),
                textAlign: 'center',
            },
        };
    })(appTheme);
};

const OVERFLOW_DISPLAY_LIMIT = 99;

interface AvatarsProps {
    size: number;
    userIds: string[];
    breakAt?: number;
    theme: Theme;
}

export default class Avatars extends PureComponent<AvatarsProps> {
    static defaultProps = {
        breakAt: 3,
    };

    render() {
        const {size, userIds, breakAt, theme} = this.props;
        const displayUserIds = userIds.slice(0, breakAt);
        const overflowUsersCount = Math.min(userIds.length - displayUserIds.length, OVERFLOW_DISPLAY_LIMIT);

        const style = getStyleSheet(theme, size);

        return (
            <TouchableWithFeedback>
                <View style={style.container}>
                    {displayUserIds.map((userId: string, i: number) => (
                        <View
                            key={'participants' + userId}
                            style={i > 0 ? style.notFirstAvatars : null}
                        >
                            <ProfilePicture
                                userId={userId}
                                size={size}
                                showStatus={false}
                            />
                        </View>
                    ))}
                    {Boolean(overflowUsersCount) && (
                        <View style={style.overflowContainer}>
                            <View style={style.overflowItem}>
                                <Text style={style.overflowText} >
                                    {'+' + overflowUsersCount.toString()}
                                </Text>
                            </View>

                        </View>
                    )}
                </View>
            </TouchableWithFeedback>
        );
    }
}

