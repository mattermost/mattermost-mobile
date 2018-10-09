// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    InteractionManager,
    ScrollView,
} from 'react-native';
import {intlShape} from 'react-intl';

import {getTermsOfService} from 'app/actions/views/terms_of_service';

import Loading from 'app/components/loading';
import Markdown from 'app/components/markdown';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class TermsOfService extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logout: PropTypes.func.isRequired,
        }),
        closeButton: PropTypes.object,
        navigator: PropTypes.object,
        termsEnabled: PropTypes.bool,
        theme: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape,
    };

    static defaultProps = {
        termsEnabled: true,
    };

    leftButton = {
        id: 'close-terms-of-service',
    };

    rightButton = {
        id: 'accept-terms-of-service',
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);

        this.state = {
            error: null,
            loading: true,
            loadingAgree: false,
            loadingDisagree: false,
            serverError: null,
            termsId: '',
            termsText: '',
        };

        this.rightButton.title = context.intl.formatMessage({id: 'terms_of_service.agreeButton', defaultMessage: 'I Agree'});
        this.leftButton.icon = props.closeButton;

        const buttons = {
            leftButtons: [this.leftButton],
            rightButtons: [this.rightButton],
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.getTerms();
    }

    getTerms = () => {
        this.setState({
            termsId: '',
            termsText: '',
            loading: true,
        });
        getTermsOfService(
            (data) => {
                this.setState({
                    termsId: data.id,
                    termsText: data.text,
                    loading: false,
                });
            },
            (err) => {
                // TODO: Handle this
                this.setState({
                    loading: false,
                }, () => {
                    Alert.alert('', err.message);
                });
            }
        );
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down',
        });
    };

    onNavigatorEvent = async (event) => {
        if (event.type === 'NavBarButtonPress') {
            const {logout} = this.props.actions;
            switch (event.id) {
            case 'close-terms-of-service':
                await this.close();
                InteractionManager.runAfterInteractions(logout);
                break;

            case 'accept-terms-of-service':
                this.close();
                break;
            }
        }
    };

    render() {
        const {navigator, theme} = this.props;
        const styles = getStyleSheet(theme);

        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);

        if (this.state.loading) {
            return <Loading/>;
        }

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
            >
                <Markdown
                    baseTextStyle={styles.baseText}
                    navigator={navigator}
                    textStyles={textStyles}
                    blockStyles={blockStyles}
                    value={(this.state.termsText || '')}
                />
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        baseText: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
            opacity: 0.6,
        },
        linkText: {
            color: theme.linkColor,
            opacity: 0.8,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            padding: 30,
        },
        scrollViewContent: {
            paddingBottom: 50,
        },
    };
});
