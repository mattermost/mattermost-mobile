// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {SafeAreaView, View, StatusBar, Keyboard} from 'react-native';
import React, {useEffect} from 'react';
import {
    Navigation,
    NavigationComponentProps,
    Options,
    OptionsTopBarButton,
} from 'react-native-navigation';
import {Theme} from '@mm-redux/types/preferences';
import {intlShape, injectIntl} from 'react-intl';
import {dismissModal, mergeNavigationOptions} from 'app/actions/navigation';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import ClearAfterSuggestion from './clear_after_suggestions';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scrollview';
import {CustomStatusDuration} from '@mm-redux/types/users';

interface Props extends NavigationComponentProps {
    intl: typeof intlShape;
    theme: Theme;
    handleClearAfterClick: (duration: CustomStatusDuration, expiresAt: string) => void;
    initialDuration: CustomStatusDuration;
}

const ClearAfterModal = (props: Props) => {
    useEffect(() => {
        const rightButton: OptionsTopBarButton = {
            id: 'update-custom-status-clear-after',
            testID: 'custom_status-clear-after.done.button',
            enabled: true,
            showAsAction: 'always',
        };
        rightButton.text = props.intl.formatMessage({
            id: 'mobile.custom_status.modal_confirm',
            defaultMessage: 'Done',
        });

        rightButton.color = props.theme.sidebarHeaderTextColor;

        const options: Options = {
            topBar: {
                rightButtons: [rightButton],
            },
        };

        mergeNavigationOptions(props.componentId, options);

        const listener = {
            navigationButtonPressed: (button: {
                buttonId: string,
            }) => {
                if (button.buttonId === 'update-custom-status-clear-after') {
                    onDone();
                }
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, props.componentId);

        return () => {
            // Make sure to unregister the listener during cleanup
            unsubscribe.remove();
        };
    }, []);
    const {theme} = props;
    const style = getStyleSheet(theme);
    let duration: CustomStatusDuration = props.initialDuration;
    let expiresAt = '';
    const onDone = () => {
        Keyboard.dismiss();
        props.handleClearAfterClick(duration, expiresAt);
        dismissModal();
    };

    const handleSuggestionClick = (durationArg: CustomStatusDuration, expiresAtArg: string) => {
        duration = durationArg;
        expiresAt = expiresAtArg;
    };

    const renderClearAfterSuggestions = () => {
        const clearAfterSuggestions = Object.values(CustomStatusDuration).map(
            (item, index, arr) => {
                if (index !== arr.length - 1) {
                    return (
                        <ClearAfterSuggestion
                            key={item}
                            handleSuggestionClick={handleSuggestionClick}
                            duration={item}
                            theme={theme}
                            separator={index !== arr.length - 2}
                        />
                    );
                }
                return null;
            },
        );

        if (clearAfterSuggestions.length <= 0) {
            return null;
        }

        return (
            <View testID='clear_after.suggestions'>
                <View style={style.block}>{clearAfterSuggestions}</View>
            </View>
        );
    };
    return (
        <SafeAreaView
            testID='clear_after.screen'
            style={style.container}
        >
            <StatusBar/>
            <KeyboardAwareScrollView bounces={false}>
                <View style={style.scrollView}>
                    {renderClearAfterSuggestions()}
                </View>
                <View style={style.block}>
                    <ClearAfterSuggestion
                        handleSuggestionClick={handleSuggestionClick}
                        duration={CustomStatusDuration.DATE_AND_TIME}
                        theme={theme}
                        separator={false}
                    />
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

ClearAfterModal.options = {
    topBar: {
        title: {
            alignment: 'center',
        },
    },
};

export default injectIntl(ClearAfterModal);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        scrollView: {
            flex: 1,
            paddingTop: 32,
            paddingBottom: 32,
        },
        separator: {
            marginTop: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});
