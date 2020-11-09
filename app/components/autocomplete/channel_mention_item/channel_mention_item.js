// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import {General} from '@mm-redux/constants';
import CompassIcon from '@components/compass_icon';
import {BotTag, GuestTag} from '@components/tag';
import {paddingHorizontal as padding} from '@components/safe_area_view/iphone_x_spacing';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

export default class ChannelMentionItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        name: PropTypes.string,
        type: PropTypes.string,
        isBot: PropTypes.bool.isRequired,
        isGuest: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    completeMention = () => {
        const {onPress, displayName, name, type} = this.props;
        if (type === General.DM_CHANNEL || type === General.GM_CHANNEL) {
            onPress('@' + displayName.replace(/ /g, ''));
        } else {
            onPress(name);
        }
    };

    render() {
        const {
            channelId,
            displayName,
            name,
            theme,
            type,
            isBot,
            isLandscape,
            isGuest,
        } = this.props;

        const style = getStyleFromTheme(theme);
        let iconName = 'globe';
        let component;
        if (type === General.PRIVATE_CHANNEL) {
            iconName = 'lock';
        }

        if (type === General.DM_CHANNEL || type === General.GM_CHANNEL) {
            if (!displayName) {
                return null;
            }

            component = (
                <TouchableWithFeedback
                    key={channelId}
                    onPress={this.completeMention}
                    style={[style.row, padding(isLandscape)]}
                    type={'opacity'}
                >
                    <Text style={style.rowDisplayName}>{'@' + displayName}</Text>
                    <BotTag
                        show={isBot}
                        theme={theme}
                    />
                    <GuestTag
                        show={isGuest}
                        theme={theme}
                    />
                </TouchableWithFeedback>
            );
        } else {
            component = (
                <TouchableWithFeedback
                    key={channelId}
                    onPress={this.completeMention}
                    style={padding(isLandscape)}
                    underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                    type={'native'}
                >
                    <View style={style.row}>
                        <CompassIcon
                            name={iconName}
                            style={style.icon}
                        />
                        <Text style={style.rowDisplayName}>{displayName}</Text>
                        <Text style={style.rowName}>{` ~${name}`}</Text>
                    </View>
                </TouchableWithFeedback>
            );
        }

        return (
            <React.Fragment>
                {component}
            </React.Fragment>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        icon: {
            fontSize: 18,
            marginRight: 11,
            color: theme.centerChannelColor,
            opacity: 0.56,
        },
        row: {
            paddingHorizontal: 16,
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowDisplayName: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        rowName: {
            fontSize: 15,
            color: theme.centerChannelColor,
            opacity: 0.56,
        },
    };
});
