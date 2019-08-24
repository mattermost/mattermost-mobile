// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
} from 'react-native';
import {NativeViewGestureHandler} from 'react-native-gesture-handler';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import ReactionHeaderItem from './reaction_header_item';

export default class ReactionHeader extends PureComponent {
    static propTypes = {
        forwardedRef: PropTypes.object,
        selected: PropTypes.string.isRequired,
        onSelectReaction: PropTypes.func.isRequired,
        reactions: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
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
            <NativeViewGestureHandler
                ref={this.props.forwardedRef}
            >
                <Animated.View style={styles.container}>
                    <ScrollView
                        alwaysBounceHorizontal={false}
                        horizontal={true}
                        overScrollMode='never'
                        style={padding(this.props.isLandscape, -10)}
                    >
                        {this.renderReactionHeaderItems()}
                    </ScrollView>
                </Animated.View>
            </NativeViewGestureHandler>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        height: 36.5,
        paddingHorizontal: 0,
        ...Platform.select({
            android: {
                borderTopRightRadius: 2,
                borderTopLeftRadius: 2,
            },
            ios: {
                borderTopRightRadius: 10,
                borderTopLeftRadius: 10,
            },
        }),
    },
});
