// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Text,
    View,
} from 'react-native';
import {Sentry} from 'react-native-sentry';

import {getFormattedFileSize} from 'mattermost-redux/utils/file_utils';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {t} from 'app/utils/i18n';
import {deleteFileCache, getFileCacheSize} from 'app/utils/file';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import Config from 'assets/config';

class AdvancedSettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            purgeOfflineStore: PropTypes.func.isRequired,
        }).isRequired,
        intl: intlShape.isRequired,
        theme: PropTypes.object,
    };

    state = {
        cacheSize: null,
        cacheSizedFetched: false,
    };

    componentDidMount() {
        this.getDownloadCacheSize();
    }

    clearOfflineCache = preventDoubleTap(() => {
        const {formatMessage} = this.props.intl;

        Alert.alert(
            formatMessage({id: t('mobile.advanced_settings.delete_title'), defaultMessage: 'Delete Documents & Data'}),
            formatMessage({id: t('mobile.advanced_settings.delete_message'), defaultMessage: '\nThis will reset all offline data and restart the app. You will be automatically logged back in once the app restarts.\n'}),
            [{
                text: formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
                onPress: () => true,
            }, {
                text: formatMessage({id: 'mobile.advanced_settings.delete', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: this.purgeDocumentsAndData,
            }],
            {cancelable: false},
        );
    });

    getDownloadCacheSize = async () => {
        const size = await getFileCacheSize();
        this.setState({cacheSize: size, cacheSizedFetched: true});
    };

    purgeDocumentsAndData = preventDoubleTap(async () => {
        const {actions} = this.props;

        await deleteFileCache();
        this.setState({cacheSize: 0, cacheSizedFetched: true});
        actions.purgeOfflineStore();
    });

    renderCacheFileSize = () => {
        const {theme} = this.props;
        const {cacheSize, cacheSizedFetched} = this.state;
        const style = getStyleSheet(theme);

        let component;
        if (cacheSize === null) {
            component = (
                <ActivityIndicator
                    size='small'
                    color={theme.centerChannelColor}
                />
            );
        } else if (cacheSizedFetched) {
            component = (
                <Text style={style.cacheSize}>
                    {getFormattedFileSize({size: cacheSize})}
                </Text>
            );
        }

        return component;
    };

    renderSentryDebugOptions = () => {
        if (!Config.ShowSentryDebugOptions) {
            return null;
        }

        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View>
                <SettingsItem
                    defaultMessage='Throw JavaScript Exception'
                    iconName='md-flame'
                    iconType='ion'
                    onPress={Sentry.crash}
                    separator={false}
                    showArrow={false}
                    theme={theme}
                />
                <View style={style.divider}/>
                <SettingsItem
                    defaultMessage='Throw Native Exception'
                    iconName='md-nuclear'
                    iconType='ion'
                    onPress={Sentry.nativeCrash}
                    separator={false}
                    showArrow={false}
                    theme={theme}
                />
                <View style={style.divider}/>
            </View>
        );
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    contentContainerStyle={style.wrapper}
                    alwaysBounceVertical={false}
                >
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Delete Documents & Data'
                        i18nId='mobile.advanced_settings.delete_title'
                        iconName='ios-refresh'
                        iconType='ion'
                        isDestructor={true}
                        onPress={this.clearOfflineCache}
                        separator={false}
                        showArrow={false}
                        rightComponent={this.renderCacheFileSize()}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                    {this.renderSentryDebugOptions()}
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            ...Platform.select({
                ios: {
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        cacheSize: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 14,
            ...Platform.select({
                android: {
                    lineHeight: 68,
                },
                ios: {
                    lineHeight: 43,
                },
            }),
        },
    };
});

export default injectIntl(AdvancedSettings);
