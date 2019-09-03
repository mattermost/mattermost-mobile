// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ScrollView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    setNavigatorStyles,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';

export default class NotificationSettingsMentionsKeywords extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            popTopScreen: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        keywords: PropTypes.string,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            keywords: props.keywords,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }
    }

    handleSubmit = () => {
        this.props.actions.popTopScreen();
    };

    keywordsRef = (ref) => {
        this.keywordsInput = ref;
    };

    onKeywordsChangeText = (keywords) => {
        return this.setState({keywords});
    };

    componentDidDisappear() {
        this.props.onBack(this.state.keywords);
    }

    render() {
        const {theme, isLandscape} = this.props;
        const {keywords} = this.state;

        const style = getStyleSheet(theme);
        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    contentContainerStyle={style.wrapper}
                    alwaysBounceVertical={false}
                >
                    <View style={style.inputContainer}>
                        <TextInputWithLocalizedPlaceholder
                            autoFocus={true}
                            ref={this.keywordsRef}
                            value={keywords}
                            blurOnSubmit={true}
                            onChangeText={this.onKeywordsChangeText}
                            onSubmitEditing={this.handleSubmit}
                            multiline={true}
                            numberOfLines={1}
                            style={[style.input, padding(isLandscape)]}
                            autoCapitalize='none'
                            autoCorrect={false}
                            placeholder={{id: 'mobile.notification_settings_mentions.keywordsDescription', defaultMessage: 'Other words that trigger a mention'}}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                            returnKeyType='done'
                            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        />
                    </View>
                    <View style={[style.helpContainer, padding(isLandscape)]}>
                        <FormattedText
                            id='mobile.notification_settings_mentions.keywordsHelp'
                            defaultMessage='Keywords are non-case sensitive and should be separated by a comma.'
                            style={style.help}
                        />
                    </View>
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
            flex: 1,
            paddingTop: 35,
        },
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 15,
            height: 150,
            paddingVertical: 10,
        },
        helpContainer: {
            marginTop: 10,
            paddingHorizontal: 15,
        },
        help: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 13,
        },
    };
});
