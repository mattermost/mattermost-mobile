// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Platform,
} from 'react-native';
import {intlShape} from 'react-intl';
import AsyncStorage from '@react-native-community/async-storage';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {DeviceTypes} from 'app/constants';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SidebarSettings extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.loadSetting();
    }

    loadSetting = async () => {
        const value = await AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS);
        const enabled = Boolean(value === 'true');
        this.setState({enabled});
    };

    saveSetting = (enabled) => {
        AsyncStorage.setItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, enabled.toString());
        this.setState({enabled}, () => EventEmitter.emit(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS));
    };

    render() {
        if (!this.state) {
            return null;
        }

        const {
            theme,
            isLandscape,
        } = this.props;
        const {enabled} = this.state;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <Section
                        disableHeader={true}
                        theme={theme}
                        isLandscape={isLandscape}
                    >
                        <View style={style.divider}/>
                        <SectionItem
                            label={(
                                <FormattedText
                                    id='mobile.sidebar_settings.permanent'
                                    defaultMessage='Permanent Sidebar'
                                />
                            )}
                            description={(
                                <FormattedText
                                    id='mobile.sidebar_settings.permanent_description'
                                    defaultMessage='Keep the sidebar open permanently'
                                />
                            )}
                            action={this.saveSetting}
                            actionType='toggle'
                            selected={enabled}
                            theme={theme}
                            isLandscape={isLandscape}
                        />
                        <View style={style.divider}/>
                    </Section>
                </View>
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
            flex: 1,
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
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginLeft: 15,
        },
    };
});
