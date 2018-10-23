// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import ReactionHeaderItem from './reaction_header_item';

export default class ReactionHeader extends PureComponent {
    static propTypes = {
        selected: PropTypes.string.isRequired,
        onSelectReaction: PropTypes.func.isRequired,
        reactions: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
    };

    handleOnPress = (emoji) => {
        this.props.onSelectReaction(emoji);
    };

    renderReactionHeaderItems = () => {
        const {selected, reactions, theme} = this.props;

        return reactions.map((reaction) => (
            <ReactionHeaderItem
                key={reaction.name}
                count={reaction.count}
                emojiName={reaction.name}
                highlight={selected === reaction.name}
                onPress={this.handleOnPress}
                theme={theme}
            />
        ));
    };

    render() {
        return (
            <View style={styles.container}>
                <ScrollView
                    alwaysBounceHorizontal={false}
                    horizontal={true}
                    overScrollMode='never'
                >
                    {this.renderReactionHeaderItems()}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        height: 37,
        paddingHorizontal: 0,
    },
});
