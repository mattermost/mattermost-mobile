// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    View,
    TouchableWithoutFeedback,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {hapticFeedback} from 'app/utils/general';
import addReactionIcon from 'assets/images/icons/reaction.png';

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
            defaultEmojis: [
                'thumbsup',
                'smiley',
                'white_check_mark',
                'heart',
                'eyes',
                'raised_hands',
            ],
        };
    }

    handlePress = (emoji, index) => {
        this.setState({
            selectedIndex: index,
        });
        hapticFeedback();
        setTimeout(() => {
            this.props.addReaction(emoji);
        }, 250);
    }

    render() {
        const {
            theme,
        } = this.props;
        const style = getStyleSheet(theme);
        const list = [];

        // Mixing recent emojis with default list and removing duplicates
        const emojis = Array.from(new Set(this.props.recentEmojis.concat(this.state.defaultEmojis)));

        emojis.forEach((emoji, index) => {
            if (index < 6) {
                const button = (
                    <TouchableWithoutFeedback onPress={() => this.handlePress(emoji, index)}>
                        <View style={[style.reactionContainer, this.state.selectedIndex === index ? style.highlight : null]}>
                            <Emoji
                                emojiName={emoji}
                                textStyle={style.emoji}
                                size={25}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                );
                list.push(button);
            }
        });

        return (
            <View style={style.reactionListContainer}>
                {list}
                <TouchableWithoutFeedback onPress={this.props.openReactionScreen}>
                    <View style={style.reactionContainer}>
                        <Image
                            source={addReactionIcon}
                            style={[style.iconImage]}
                            height={24}
                            width={28}
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
            paddingLeft: 20,
            paddingRight: 20,
            height: 64,
            justifyContent: 'space-between',
        },
        reactionContainer: {
            height: 45,
            width: 45,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
