// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, FlatList} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import StatusBar from 'app/components/status_bar';
import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';
import FormattedText from 'app/components/formatted_text';

import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import Preferences from 'mattermost-redux/constants/preferences';

export default class Theme extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
        }).isRequired,
        allowedThemes: PropTypes.arrayOf(PropTypes.object),
        customTheme: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        teamId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        userId: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        customTheme: null,
    };

    static getDerivedStateFromProps(props, state) {
        if (!state.customTheme && props.customTheme) {
            return {
                customTheme: props.customTheme,
            };
        }
        return null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.theme !== this.props.theme) {
            setNavigatorStyles(this.props.navigator, this.props.theme);
        }
    }

    setTheme = (key) => {
        const {userId, teamId, actions: {savePreferences}, allowedThemes} = this.props;
        const {customTheme} = this.state;
        const selectedTheme = allowedThemes.concat(customTheme).find((theme) => theme.key === key);

        savePreferences(userId, [{
            user_id: userId,
            category: Preferences.CATEGORY_THEME,
            name: teamId,
            value: JSON.stringify(selectedTheme),
        }]);
    }

    renderThemeRow = ({item, title}) => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <React.Fragment>
                <SectionItem
                    label={(
                        <FormattedText
                            id={`user.settings.display.${item.type}`}
                            defaultMessage={title || item.type}
                        />
                    )}
                    action={this.setTheme}
                    actionType='select'
                    actionValue={item.key}
                    selected={item.type.toLowerCase() === theme.type.toLowerCase()}
                    theme={theme}
                />
                <View style={style.divider}/>
            </React.Fragment>
        );
    };

    keyExtractor = (item) => item.key;

    render() {
        const {theme, allowedThemes} = this.props;
        const {customTheme} = this.state;
        const style = getStyleSheet(theme);
        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <Section
                        disableHeader={true}
                        theme={theme}
                    >
                        <FlatList
                            data={allowedThemes}
                            renderItem={this.renderThemeRow}
                            keyExtractor={this.keyExtractor}
                        />
                    </Section>

                    {customTheme &&
                        <Section
                            disableHeader={true}
                            theme={theme}
                        >
                            {this.renderThemeRow({item: customTheme, title: 'Custom'})}
                        </Section>
                    }
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
            paddingTop: 35,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
    };
});
