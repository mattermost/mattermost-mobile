// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    ScrollView,
} from 'react-native';
import {intlShape} from 'react-intl';

import {getTermsOfService, updateTermsOfServiceStatus} from 'app/actions/views/terms_of_service';

import Loading from 'app/components/loading';
import Markdown from 'app/components/markdown';
import ErrorBanner from 'app/components/error_banner';
import StatusBar from 'app/components/status_bar';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class TermsOfService extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logout: PropTypes.func.isRequired,
        }),
        closeButton: PropTypes.object,
        navigator: PropTypes.object,
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
            serverError: null,
            termsId: '',
            termsText: '',
        };

        this.rightButton.title = context.intl.formatMessage({id: 'terms_of_service.agreeButton', defaultMessage: 'I Agree'});
        this.leftButton.icon = props.closeButton;

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        this.setNavigatorButtons();
    }

    componentDidMount() {
        this.getTerms();
    }

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.navigator, this.props.theme);
        }
    }

    setNavigatorButtons = (enabled = true) => {
        const buttons = {
            leftButtons: [{...this.leftButton, disabled: !enabled}],
            rightButtons: [{...this.rightButton, disabled: !enabled}],
        };

        this.props.navigator.setButtons(buttons);
    };

    getTerms = () => {
        const {intl} = this.context;

        this.setState({
            termsId: '',
            termsText: '',
            loading: true,
            serverError: null,
        });

        getTermsOfService(
            (data) => {
                this.setState({
                    termsId: data.id,
                    termsText: data.text,
                    loading: false,
                });
            },
            () => {
                this.setState({
                    loading: false,
                    serverError: intl.formatMessage({
                        id: 'terms_of_service.api_error',
                        defaultMessage: 'Unable to complete the request. If this issue persists, contact your System Administrator.',
                    }),
                });

                // TODO: Show an error message on login screen
            }
        );
    };

    handleAcceptTerms = () => {
        this.setNavigatorButtons(false);
        this.registerUserAction(
            true,
            () => {
                this.setNavigatorButtons(true);
                this.props.navigator.dismissModal({
                    animationType: 'slide-down',
                });
            }
        );
    };

    handleRejectTerms = () => {
        const {logout} = this.props.actions;
        this.setNavigatorButtons(false);
        this.registerUserAction(
            false,
            () => {
                this.setNavigatorButtons(true);
                this.props.navigator.dismissAllModals();
                InteractionManager.runAfterInteractions(logout);

                // TODO: Show an error message on login screen
            }
        );
    };

    registerUserAction = (accepted, success) => {
        const {intl} = this.context;

        this.setState({
            loading: true,
            serverError: null,
        });
        updateTermsOfServiceStatus(
            this.state.termsId,
            accepted,
            success,
            () => {
                this.setNavigatorButtons(true);
                this.setState({
                    loading: false,
                    serverError: intl.formatMessage({
                        id: 'terms_of_service.api_error',
                        defaultMessage: 'Unable to complete the request. If this issue persists, contact your System Administrator.',
                    }),
                });
            },
        );
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-terms-of-service':
                this.handleRejectTerms();
                break;

            case 'accept-terms-of-service':
                this.handleAcceptTerms();
                break;
            }
        }
    };

    dismissErrorBanner = () => {
        this.setState({
            serverError: null,
        });
    };

    render() {
        const {navigator, theme} = this.props;
        const {serverError} = this.state;
        const styles = getStyleSheet(theme);

        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);

        if (this.state.loading) {
            return <Loading/>;
        }

        return (
            <React.Fragment>
                <StatusBar/>
                <ErrorBanner
                    text={serverError}
                    visible={Boolean(serverError)}
                    onClose={this.dismissErrorBanner}
                />
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <Markdown
                        baseTextStyle={styles.baseText}
                        navigator={navigator}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={this.state.termsText}
                    />
                </ScrollView>
            </React.Fragment>
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
