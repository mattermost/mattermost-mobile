// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ScrollView, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class NotificationSettingsMentionsKeywords extends PureComponent {
    static propTypes = {
        keywords: PropTypes.string,
        navigator: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            keywords: props.keywords,
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    handleSubmit = () => {
        this.props.navigator.pop();
    };

    keywordsRef = (ref) => {
        this.keywordsInput = ref;
    };

    onKeywordsChangeText = (keywords) => {
        if (keywords.endsWith('\n')) {
            return this.handleSubmit();
        }

        return this.setState({keywords});
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.props.onBack(this.state.keywords);
                break;
            }
        }
    };

    render() {
        const {theme} = this.props;
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
                            blurOnSubmit={false}
                            onChangeText={this.onKeywordsChangeText}
                            multiline={true}
                            numberOfLines={1}
                            style={style.input}
                            autoCapitalize='none'
                            autoCorrect={false}
                            placeholder={{id: 'mobile.notification_settings_mentions.keywordsDescription', defaultMessage: 'Other words that trigger a mention'}}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                            returnKeyType='done'
                        />
                    </View>
                    <View style={style.helpContainer}>
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
            paddingHorizontal: 15,
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
