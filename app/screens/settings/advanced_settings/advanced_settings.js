// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Text,
    View
} from 'react-native';

import {getFormattedFileSize} from 'mattermost-redux/utils/file_utils';

import SettingsItem from 'app/screens/settings/settings_item';
import StatusBar from 'app/components/status_bar';
import {deleteFileCache, getFileCacheSize} from 'app/utils/file';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class AdvancedSettings extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            purgeOfflineStore: PropTypes.func.isRequired
        }).isRequired,
        intl: intlShape.isRequired,
        theme: PropTypes.object
    };

    state = {
        cacheSize: null,
        cacheSizedFetched: false
    };

    componentDidMount() {
        this.getDownloadCacheSize();
    }

    clearOfflineCache = wrapWithPreventDoubleTap(() => {
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
    });

    clearDownloadCache = wrapWithPreventDoubleTap(() => {
        const {intl} = this.props;
        const {cacheSize} = this.state;

        if (cacheSize !== '0 B') {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.advanced_settings.delete_file_cache',
                    defaultMessage: 'Delete File Cache'
                }),
                intl.formatMessage({
                    id: 'mobile.advanced_settings.delete_file_cache_message',
                    defaultMessage: '\nThis will delete all the files stored in the cache. Are you sure you want to delete them?\n'
                }),
                [{
                    text: intl.formatMessage({id: 'mobile.advanced_settings.delete', defaultMessage: 'Delete'}),
                    onPress: () => {
                        this.setState({cacheSize: null, cacheSizedFetched: false}, async () => {
                            await deleteFileCache();
                            this.setState({cacheSize: getFormattedFileSize({size: 0}), cacheSizedFetched: true});
                        });
                    }
                }, {
                    text: intl.formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                    onPress: () => true
                }]
            );
        }
    });

    getDownloadCacheSize = async () => {
        const size = await getFileCacheSize();
        this.setState({cacheSize: getFormattedFileSize({size}), cacheSizedFetched: true});
    };

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
                    {cacheSize}
                </Text>
            );
        }

        return component;
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Reset Cache'
                        i18nId='mobile.advanced_settings.reset_title'
                        iconName='ios-refresh'
                        iconType='ion'
                        onPress={this.clearOfflineCache}
                        separator={false}
                        showArrow={false}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                    <SettingsItem
                        defaultMessage='Delete File Cache'
                        i18nId='mobile.advanced_settings.clear_downloads'
                        iconName='md-trash'
                        iconType='ion'
                        onPress={this.clearDownloadCache}
                        separator={false}
                        showArrow={false}
                        rightComponent={this.renderCacheFileSize()}
                        theme={theme}
                    />
                    <View style={style.divider}/>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            ...Platform.select({
                ios: {
                    paddingTop: 35
                }
            })
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1
        },
        cacheSize: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 14,
            lineHeight: 43
        }
    };
});

export default injectIntl(AdvancedSettings);
