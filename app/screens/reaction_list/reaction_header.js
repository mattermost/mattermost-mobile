// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    View,
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ReactionHeaderItem from './reaction_header_item';

export default class ReactionHeader extends PureComponent {
    static propTypes = {
        selected: PropTypes.string.isRequired,
        onSelectReaction: PropTypes.func.isRequired,
        reactions: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
    }

    handleOnPress = (emoji) => {
        this.props.onSelectReaction(emoji);
    };

    render() {
        const {selected, reactions, theme} = this.props;

        const styles = getStyleSheet(theme);

        return (
            <View style={styles.container}>
                <ScrollView
                    alwaysBounceHorizontal={false}
                    horizontal={true}
                    overScrollMode='never'
                >
                    {reactions.map((reaction) => (
                        <ReactionHeaderItem
                            key={reaction.name}
                            count={reaction.count}
                            emojiName={reaction.name}
                            highlight={selected === reaction.name}
                            onPress={this.handleOnPress}
                            theme={theme}
                        />
                    ))}
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            height: 50,
            paddingHorizontal: 10,
        },
    };
});
