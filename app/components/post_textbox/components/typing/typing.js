import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Text,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

const {View: AnimatedView} = Animated;

export default class Typing extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        typing: PropTypes.array.isRequired,
    };

    state = {
        typingHeight: new Animated.Value(0),
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.typing.length && !this.props.typing.length) {
            this.animateTyping(true);
        } else if (!nextProps.typing.length) {
            this.animateTyping();
        }
    }

    animateTyping = (show = false) => {
        const height = show ? 20 : 0;

        Animated.timing(this.state.typingHeight, {
            toValue: height,
            duration: 200,
        }).start();
    }

    renderTyping = () => {
        const {typing} = this.props;
        const nextTyping = [...typing];
        const numUsers = nextTyping.length;

        switch (numUsers) {
        case 0:
            return null;
        case 1:
            return (
                <FormattedText
                    id='msg_typing.isTyping'
                    defaultMessage='{user} is typing...'
                    values={{
                        user: nextTyping[0],
                    }}
                />
            );
        default: {
            const last = nextTyping.pop();
            return (
                <FormattedText
                    id='msg_typing.areTyping'
                    defaultMessage='{users} and {last} are typing...'
                    values={{
                        users: (nextTyping.join(', ')),
                        last,
                    }}
                />
            );
        }
        }
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <AnimatedView style={{height: this.state.typingHeight}}>
                <Text
                    style={style.typing}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    {this.renderTyping()}
                </Text>
            </AnimatedView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        typing: {
            paddingLeft: 10,
            paddingTop: 3,
            fontSize: 11,
            marginBottom: 5,
            color: theme.centerChannelColor,
            backgroundColor: 'transparent',
        },
    };
});
