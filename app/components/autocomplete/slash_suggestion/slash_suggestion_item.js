// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

export default class SlashSuggestionItem extends PureComponent {
    static propTypes = {
        description: PropTypes.string,
        hint: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        trigger: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
    };

    completeSuggestion = () => {
        const {onPress, trigger} = this.props;
        onPress(trigger);
    };

    render() {
        const {
            description,
            hint,
            theme,
            trigger,
            isLandscape,
        } = this.props;

        const style = getStyleFromTheme(theme);

        return (
            <TouchableOpacity
                onPress={this.completeSuggestion}
                style={[style.row, padding(isLandscape)]}
            >
                <Text style={style.suggestionName}>{`/${trigger} ${hint}`}</Text>
                <Text style={style.suggestionDescription}>{description}</Text>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            height: 55,
            justifyContent: 'center',
            paddingHorizontal: 8,
            backgroundColor: theme.centerChannelBg,
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        rowDisplayName: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowName: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
        suggestionDescription: {
            fontSize: 11,
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        suggestionName: {
            fontSize: 13,
            color: theme.centerChannelColor,
            marginBottom: 5,
        },
    };
});
