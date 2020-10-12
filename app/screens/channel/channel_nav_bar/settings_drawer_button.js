// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {intlShape} from 'react-intl';

export class SettingDrawerButton extends PureComponent {
    static propTypes = {
        openSidebar: PropTypes.func.isRequired,
        theme: PropTypes.object,
    };

    static defaultProps = {
        theme: {},
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handlePress = preventDoubleTap(() => {
        this.props.openSidebar();
    });

    render() {
        const {theme} = this.props;

        const {formatMessage} = this.context.intl;

        const buttonDescriptor = {
            id: t('navbar.more_options.button'),
            defaultMessage: 'More Options',
            description: 'Accessibility helper for more options button in channel header.',
        };
        const accessibilityLabel = formatMessage(buttonDescriptor);

        const buttonHint = {
            id: t('navbar.more_options.hint'),
            defaultMessage: 'Opens the more options right hand sidebar',
            description: 'Accessibility helper for explaining what the more options button in the channel header will do.',
        };
        const accessibilityHint = formatMessage(buttonHint);

        const style = getStyleFromTheme(theme);

        const icon = (
            <Icon
                name='ellipsis-vertical'
                size={25}
                color={theme.sidebarHeaderTextColor}
            />
        );

        return (
            <TouchableOpacity
                accessible={true}
                accessibilityHint={accessibilityHint}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole='button'
                testID='sidebar.settings.button'
                onPress={this.handlePress}
                style={style.container}
            >
                <View style={style.wrapper}>
                    {icon}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 44,
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: 8,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
    };
});

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(SettingDrawerButton);
