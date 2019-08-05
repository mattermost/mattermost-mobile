// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Platform,
} from 'react-native';
import {intlShape} from 'react-intl';

import {getTimezoneRegion} from 'mattermost-redux/utils/timezone_utils';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {getDeviceTimezone} from 'app/utils/timezone';

export default class Timezone extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        timezones: PropTypes.array.isRequired,
        user: PropTypes.object.isRequired,
        userTimezone: PropTypes.shape({
            useAutomaticTimezone: PropTypes.bool.isRequired,
            automaticTimezone: PropTypes.string.isRequired,
            manualTimezone: PropTypes.string.isRequired,
        }).isRequired,
        actions: PropTypes.shape({
            getSupportedTimezones: PropTypes.func.isRequired,
            updateUser: PropTypes.func.isRequired,
        }).isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        timezones: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.state = {
            useAutomaticTimezone: props.userTimezone.useAutomaticTimezone,
        };
    }

    componentWillMount() {
        const {actions: {getSupportedTimezones}, timezones} = this.props;

        if (timezones.length === 0) {
            getSupportedTimezones();
        }
    }

    updateAutomaticTimezone = (useAutomaticTimezone) => {
        const {userTimezone: {manualTimezone}} = this.props;
        let automaticTimezone = '';

        this.setState({useAutomaticTimezone});
        if (useAutomaticTimezone) {
            automaticTimezone = getDeviceTimezone();
            this.submitUser({
                useAutomaticTimezone,
                automaticTimezone,
                manualTimezone,
            });
            return;
        }

        if (manualTimezone?.length > 0) {
            // Preserve state change in server if manualTimezone exists
            this.submitUser({
                useAutomaticTimezone,
                automaticTimezone,
                manualTimezone,
            });
        }
    };

    updateManualTimezone = (manualTimezone) => {
        this.submitUser({
            useAutomaticTimezone: false,
            automaticTimezone: '',
            manualTimezone,
        });
    };

    submitUser = ({
        useAutomaticTimezone,
        automaticTimezone,
        manualTimezone,
    }) => {
        const {user} = this.props;

        const timezone = {
            useAutomaticTimezone: useAutomaticTimezone.toString(),
            automaticTimezone,
            manualTimezone,
        };

        const updatedUser = {
            ...user,
            timezone,
        };

        this.props.actions.updateUser(updatedUser);
    };

    goToSelectTimezone = () => {
        const {
            actions,
            userTimezone: {manualTimezone},
        } = this.props;
        const {intl} = this.context;
        const screen = 'SelectTimezone';
        const title = intl.formatMessage({id: 'mobile.timezone_settings.select', defaultMessage: 'Select Timezone'});
        const passProps = {
            selectedTimezone: manualTimezone,
            onBack: this.updateManualTimezone,
        };

        this.goingBack = false;

        actions.goToScreen(screen, title, passProps);
    };

    render() {
        const {
            theme,
            userTimezone: {
                automaticTimezone,
                manualTimezone,
            },
            isLandscape,
        } = this.props;
        const {useAutomaticTimezone} = this.state;
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
                                    id='mobile.timezone_settings.automatically'
                                    defaultMessage='Set automatically'
                                />
                            )}
                            description={(
                                <Text>
                                    {useAutomaticTimezone && getTimezoneRegion(automaticTimezone)}
                                </Text>
                            )}
                            action={this.updateAutomaticTimezone}
                            actionType='toggle'
                            selected={useAutomaticTimezone}
                            theme={theme}
                            isLandscape={isLandscape}
                        />

                        {!useAutomaticTimezone && (
                            <View>
                                <View style={style.separator}/>
                                <SectionItem
                                    label={(
                                        <FormattedText
                                            id='mobile.timezone_settings.manual'
                                            defaultMessage='Change timezone'
                                        />
                                    )}
                                    description={(
                                        <Text>
                                            {getTimezoneRegion(manualTimezone)}
                                        </Text>
                                    )}
                                    action={this.goToSelectTimezone}
                                    actionType='arrow'
                                    theme={theme}
                                    isLandscape={isLandscape}
                                />
                            </View>
                        )}
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
