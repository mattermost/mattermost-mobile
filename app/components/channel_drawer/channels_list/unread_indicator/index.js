// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableWithoutFeedback,
    View,
    ViewPropTypes,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class UnreadIndicator extends PureComponent {
    static propTypes = {
        show: PropTypes.bool,
        style: ViewPropTypes.style,
        onPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onPress: () => true,
    };

    render() {
        const {onPress, show, theme} = this.props;

        if (!show) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <TouchableWithoutFeedback onPress={onPress}>
                <View
                    style={[style.container, this.props.style]}
                >
                    <FormattedText
                        style={style.indicatorText}
                        id='sidebar.unreads'
                        defaultMessage='More unreads'
                    />
                    <IonIcon
                        size={14}
                        name='md-arrow-round-up'
                        color={theme.mentionColor}
                        style={style.arrow}
                    />
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            position: 'absolute',
            borderRadius: 15,
            marginHorizontal: 15,
            height: 25,
        },
        indicatorText: {
            backgroundColor: 'transparent',
            color: theme.mentionColor,
            fontSize: 14,
            paddingVertical: 2,
            paddingHorizontal: 4,
            textAlign: 'center',
            textAlignVertical: 'center',
        },
        arrow: {
            position: 'relative',
            bottom: -1,
        },
    };
});
