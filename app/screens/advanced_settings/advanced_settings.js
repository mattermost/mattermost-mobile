// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    TouchableOpacity,
    View
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class AdvancedSettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            purgeOfflineStore: PropTypes.func.isRequired
        }).isRequired,
        intl: intlShape.isRequired,
        theme: PropTypes.object
    };

    buildItemRow = (icon, id, defaultMessage, action, separator = true, nextArrow = false) => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View
                key={id}
                style={style.itemWrapper}
            >
                <TouchableOpacity
                    style={style.item}
                    onPress={() => this.handlePress(action)}
                >
                    <View style={style.itemLeftIconContainer}>
                        <MaterialIcon
                            name={icon}
                            size={18}
                            style={style.itemLeftIcon}
                        />
                    </View>
                    <FormattedText
                        id={id}
                        defaultMessage={defaultMessage}
                        style={style.itemText}
                    />
                    {nextArrow &&
                    <MaterialIcon
                        name='angle-right'
                        size={18}
                        style={style.itemRightIcon}
                    />
                    }
                </TouchableOpacity>
                {separator && <View style={style.separator}/>}
            </View>
        );
    };

    clearOfflineCache = () => {
        const {actions, intl} = this.props;

        Alert.alert(
            intl.formatMessage({id: 'mobile.advanced_settings.reset_title', defaultMessage: 'Reset Cache'}),
            intl.formatMessage({id: 'mobile.advanced_settings.reset_message', defaultMessage: '\nThis will reset all offline data and restart the app. You will be automatically logged back in once the app restarts.\n'}),
            [{
                text: intl.formatMessage({id: 'mobile.advanced_settings.reset_button', defaultMessage: 'Reset'}),
                onPress: () => actions.purgeOfflineStore()
            }, {
                text: intl.formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                onPress: () => true
            }]
        );
    };

    handlePress = (action) => {
        preventDoubleTap(action, this);
    };

    renderItems = () => {
        return [
            this.buildItemRow('storage', 'mobile.advanced_settings.reset_title', 'Reset Cache', this.clearOfflineCache, false, false)
        ];
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.wrapper}>
                <StatusBar/>
                <View style={style.container}>
                    <View style={style.itemsContainer}>
                        {this.renderItems()}
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        item: {
            height: 45,
            flexDirection: 'row',
            alignItems: 'center'
        },
        itemLeftIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        itemLeftIconContainer: {
            width: 18,
            marginRight: 15,
            alignItems: 'center',
            justifyContent: 'center'
        },
        itemText: {
            fontSize: 16,
            color: theme.centerChannelColor,
            flex: 1
        },
        itemRightIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        itemsContainer: {
            marginTop: 30,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        itemWrapper: {
            marginHorizontal: 15
        },
        separator: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        wrapper: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    };
});

export default injectIntl(AdvancedSettings);
