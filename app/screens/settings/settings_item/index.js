// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, TouchableOpacity, View} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import {paddingRight, paddingLeft} from 'app/components/safe_area_view/iphone_x_spacing';
import FormattedText from 'app/components/formatted_text';
import VectorIcon from 'app/components/vector_icon.js';

import getStyleSheet from './style';

export default class SettingsItem extends PureComponent {
    static propTypes = {
        defaultMessage: PropTypes.string.isRequired,
        messageValues: PropTypes.object,
        i18nId: PropTypes.string,
        iconName: PropTypes.string,
        iconType: PropTypes.oneOf(['fontawesome', 'foundation', 'ion', 'material']),
        isDestructor: PropTypes.bool,
        centered: PropTypes.bool,
        onPress: PropTypes.func,
        rightComponent: PropTypes.node,
        separator: PropTypes.bool,
        showArrow: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        isDestructor: false,
        separator: true,
        isLandscape: false,
    };

    renderText = () => {
        const {
            centered,
            defaultMessage,
            messageValues,
            i18nId,
            isDestructor,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        const textStyle = [style.label];

        if (isDestructor) {
            textStyle.push(style.destructor);
        }

        if (centered) {
            textStyle.push(style.centerLabel);
        }

        if (!i18nId) {
            return <Text style={textStyle}>{defaultMessage}</Text>;
        }

        return (
            <FormattedText
                values={messageValues}
                id={i18nId}
                defaultMessage={defaultMessage}
                style={textStyle}
            />
        );
    };

    render() {
        const {
            iconName,
            iconType,
            onPress,
            rightComponent,
            separator,
            showArrow,
            theme,
            isLandscape,
        } = this.props;
        const style = getStyleSheet(theme);

        let divider;
        if (separator) {
            divider = (<View style={style.divider}/>);
        }

        let icon;
        if (iconType && iconName) {
            const iconStyle = [style.icon];
            icon = (
                <VectorIcon
                    name={iconName}
                    type={iconType}
                    style={iconStyle}
                />
            );
        }

        let additionalComponent;
        if (showArrow) {
            additionalComponent = (
                <FontAwesomeIcon
                    name='angle-right'
                    style={style.arrow}
                />
            );
        } else if (rightComponent) {
            additionalComponent = rightComponent;
        }

        return (
            <TouchableOpacity
                onPress={onPress}
            >
                <View style={[style.container, paddingLeft(isLandscape)]}>
                    {icon &&
                    <View style={style.iconContainer}>
                        {icon}
                    </View>
                    }
                    <View style={style.wrapper}>
                        <View style={[style.labelContainer, paddingRight(isLandscape)]}>
                            {this.renderText()}
                            {Boolean(additionalComponent) &&
                            <View style={style.arrowContainer}>
                                {additionalComponent}
                            </View>
                            }
                        </View>
                        {divider}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}
