// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    TouchableWithoutFeedback,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {hapticFeedback} from 'app/utils/general';
import {
    LARGE_CONTAINER_SIZE,
    LARGE_ICON_SIZE,
} from 'app/constants/reaction_picker';

export default class ReactionButton extends PureComponent {
    static propTypes = {
        addReaction: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        emoji: PropTypes.string.isRequired,
        iconSize: PropTypes.number,
        containerSize: PropTypes.number,
    }

    static defaultProps = {
        iconSize: LARGE_ICON_SIZE,
        containerSize: LARGE_CONTAINER_SIZE,
    };

    constructor(props) {
        super(props);
        this.state = {
            isSelected: false,
        };
    }

    handlePress = () => {
        hapticFeedback();
        this.setState({isSelected: true}, () => {
            this.props.addReaction(this.props.emoji);
        });
    }

    render() {
        const {
            theme,
            emoji,
            iconSize,
            containerSize,
        } = this.props;
        const style = getStyleSheet(theme);
        const testID = `reaction_picker.reaction_button.${emoji}`;

        return (
            <TouchableWithoutFeedback
                testID={testID}
                key={emoji}
                onPress={this.handlePress}
            >
                <View
                    style={[
                        style.reactionContainer,
                        this.state.isSelected ? style.highlight : null,
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
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        emoji: {
            color: '#000',
            fontWeight: 'bold',
        },
        highlight: {
            backgroundColor: changeOpacity(theme.linkColor, 0.1),
        },
        reactionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
