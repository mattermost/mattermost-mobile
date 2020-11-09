// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Text, View} from 'react-native';

import {paddingHorizontal as padding} from '@components/safe_area_view/iphone_x_spacing';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import slashIcon from '@assets/images/autocomplete/slash_command.png';

export default class SlashSuggestionItem extends PureComponent {
    static propTypes = {
        description: PropTypes.string,
        hint: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        suggestion: PropTypes.string,
        complete: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
    };

    completeSuggestion = () => {
        const {onPress, complete} = this.props;
        onPress(complete);
    };

    render() {
        const {
            description,
            hint,
            theme,
            suggestion,
            complete,
            isLandscape,
        } = this.props;

        const style = getStyleFromTheme(theme);

        let suggestionText = suggestion;
        if (suggestionText[0] === '/' && complete.split(' ').length === 1) {
            suggestionText = suggestionText.substring(1);
        }

        return (
            <TouchableWithFeedback
                onPress={this.completeSuggestion}
                style={padding(isLandscape)}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                type={'native'}
            >
                <View style={style.container}>
                    <View style={style.icon}>
                        <Image
                            style={style.iconColor}
                            width={10}
                            height={16}
                            source={slashIcon}
                        />
                    </View>
                    <View style={style.suggestionContainer}>
                        <Text style={style.suggestionName}>{`${suggestionText} ${hint}`}</Text>
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.suggestionDescription}
                        >
                            {description}
                        </Text>
                    </View>
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        icon: {
            fontSize: 24,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            width: 35,
            height: 35,
            marginRight: 12,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
        },
        iconColor: {
            tintColor: theme.centerChannelColor,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 8,
            paddingHorizontal: 16,
            overflow: 'hidden',
        },
        suggestionContainer: {
            flex: 1,
        },
        suggestionDescription: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        suggestionName: {
            fontSize: 15,
            color: theme.centerChannelColor,
            marginBottom: 4,
        },
    };
});
