// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    View,
    TouchableWithoutFeedback,
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import addReactionIcon from 'assets/images/icons/reaction.png';
import ReactionButton from './reaction_button';
import {
    REACTION_PICKER_HEIGHT,
    DEFAULT_EMOJIS,
    SMALL_ICON_BREAKPOINT,
    SMALL_CONTAINER_SIZE,
    LARGE_CONTAINER_SIZE,
    SMALL_ICON_SIZE,
    LARGE_ICON_SIZE,
} from 'app/constants/reaction_picker';

export default class ReactionPicker extends PureComponent {
    static propTypes = {
        addReaction: PropTypes.func.isRequired,
        openReactionScreen: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        recentEmojis: PropTypes.array,
        deviceWidth: PropTypes.number,
    }

    handlePress = (emoji) => {
        this.props.addReaction(emoji);
    }

    render() {
        const {
            theme,
            deviceWidth,
        } = this.props;
        const style = getStyleSheet(theme);
        const isSmallDevice = deviceWidth < SMALL_ICON_BREAKPOINT;

        let containerSize = LARGE_CONTAINER_SIZE;
        let iconSize = LARGE_ICON_SIZE;

        if (isSmallDevice) {
            containerSize = SMALL_CONTAINER_SIZE;
            iconSize = SMALL_ICON_SIZE;
        }

        // Mixing recent emojis with default list and removing duplicates
        const emojis = Array.from(new Set(this.props.recentEmojis.concat(DEFAULT_EMOJIS))).splice(0, 6);

        const list = emojis.map((emoji) => {
            return (
                <ReactionButton
                    key={emoji}
                    theme={theme}
                    addReaction={this.handlePress}
                    emoji={emoji}
                    iconSize={iconSize}
                    containerSize={containerSize}
                />
            );
        });

        return (
            <View style={style.reactionListContainer}>
                {list}
                <TouchableWithoutFeedback onPress={this.props.openReactionScreen}>
                    <View
                        style={[
                            style.reactionContainer,
                            {
                                width: containerSize,
                                height: containerSize,
                            },
                        ]}
                    >
                        <Image
                            source={addReactionIcon}
                            style={[style.iconImage]}
                            width={iconSize}
                            height={iconSize}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        iconImage: {
            tintColor: theme.centerChannelColor,
        },
        reactionListContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 12,
            paddingRight: 12,
            height: REACTION_PICKER_HEIGHT,
            justifyContent: 'space-between',
        },
        reactionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
