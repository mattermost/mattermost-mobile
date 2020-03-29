// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Image,
    View,
    TouchableWithoutFeedback,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {hapticFeedback} from 'app/utils/general';
import addReactionIcon from 'assets/images/icons/reaction.png';
import {
    REACTION_PICKER_HEIGHT,
    DEFAULT_EMOJIS,
    SMALL_ICON_BREAKPOINT,
    SMALL_CONTAINER_SIZE,
    LARGE_CONTAINER_SIZE,
    SMALL_ICON_SIZE,
    LARGE_ICON_SIZE,
} from 'app/constants/reaction_picker';

export default class Reaction extends PureComponent {
    static propTypes = {
        addReaction: PropTypes.func.isRequired,
        openReactionScreen: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        recentEmojis: PropTypes.array,
    }

    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: -1,
        };
    }

    handlePress = (emoji, index) => {
        hapticFeedback();
        this.setState({selectedIndex: index}, () => {
            this.props.addReaction(emoji);
        });
    }

    render() {
        const {
            theme,
        } = this.props;
        const style = getStyleSheet(theme);
        const isSmallDevice = Dimensions.get('window').width < SMALL_ICON_BREAKPOINT;

        let containerSize = LARGE_CONTAINER_SIZE;
        let iconSize = LARGE_ICON_SIZE;

        if (isSmallDevice) {
            containerSize = SMALL_CONTAINER_SIZE;
            iconSize = SMALL_ICON_SIZE;
        }

        // Mixing recent emojis with default list and removing duplicates
        const emojis = Array.from(new Set(this.props.recentEmojis.concat(DEFAULT_EMOJIS))).splice(0, 6);

        const list = emojis.map((emoji, index) => {
            return (
                <TouchableWithoutFeedback
                    key={emoji}
                    onPress={() => this.handlePress(emoji, index)}
                >
                    <View
                        style={[
                            style.reactionContainer,
                            this.state.selectedIndex === index ? style.highlight : null,
                            {
                                width: containerSize,
                                height: containerSize,
                            },
                        ]}
                    >
                        <Emoji
                            emojiName={emoji}
                            textStyle={style.emoji}
                            size={iconSize}
                        />
                    </View>
                </TouchableWithoutFeedback>
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
        emoji: {
            color: '#000',
            fontWeight: 'bold',
        },
        iconImage: {
            tintColor: theme.centerChannelColor,
        },
        highlight: {
            backgroundColor: changeOpacity(theme.linkColor, 0.1),
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
