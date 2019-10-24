// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
} from 'react-native';

import {General} from 'mattermost-redux/constants';
import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import {BotTag, GuestTag} from 'app/components/tag';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

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

        let component;
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
                    style={[style.row, padding(isLandscape)]}
                    type={'opacity'}
                >
                    <Text style={style.rowDisplayName}>{displayName}</Text>
                    <Text style={style.rowName}>{` (~${name})`}</Text>
                </TouchableWithFeedback>
            );
        }

        return (
            <React.Fragment>
                {component}
                <AutocompleteDivider/>
            </React.Fragment>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        rowDisplayName: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowName: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
    };
});
