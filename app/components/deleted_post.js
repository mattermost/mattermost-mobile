// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';
import AppIcon from 'app/components/app_icon';
import {ViewTypes} from 'app/constants';

class DeletedPost extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        return (
            <View style={style.main}>
                <View style={style.iconContainer}>
                    <AppIcon
                        color={theme.centerChannelColor}
                        height={ViewTypes.PROFILE_PICTURE_SIZE}
                        width={ViewTypes.PROFILE_PICTURE_SIZE}
                    />
                </View>
                <View style={style.textContainer}>
                    <FormattedText
                        id='post_info.system'
                        defaultMessage='System'
                        style={style.displayName}
                    />
                    <View style={style.messageContainer}>
                        <FormattedText
                            id='rhs_thread.rootPostDeletedMessage.body'
                            defaultMessage='Part of this thread has been deleted due to a data retention policy. You can no longer reply to this thread.'
                            style={style.message}
                        />
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const stdPadding = 12;
    return {
        main: {
            flexDirection: 'row',
            paddingTop: stdPadding,
        },
        iconContainer: {
            paddingRight: stdPadding,
            paddingLeft: stdPadding,
            width: (stdPadding * 2) + ViewTypes.PROFILE_PICTURE_SIZE,
        },
        textContainer: {
            paddingBottom: 10,
            flex: 1,
            marginRight: stdPadding,
        },
        messageContainer: {
            marginTop: 3,
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 15,
            lineHeight: 22,
        },
    };
});

export default DeletedPost;