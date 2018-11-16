// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {ScrollView} from 'react-native';

import {checkDialogElementForError, checkIfErrorsMatchElements} from 'mattermost-redux/utils/integration_utils';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import StatusBar from 'app/components/status_bar';
import FormattedText from 'app/components/formatted_text';

import DialogElement from './dialog_element.js';

export default class InteractiveDialog extends PureComponent {
    static propTypes = {
        url: PropTypes.string.isRequired,
        callbackId: PropTypes.string,
        elements: PropTypes.arrayOf(PropTypes.object).isRequired,
        notifyOnCancel: PropTypes.bool,
        state: PropTypes.string,
        navigator: PropTypes.object,
        theme: PropTypes.object,
        actions: PropTypes.shape({
            submitInteractiveDialog: PropTypes.func.isRequired,
        }).isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        const values = {};
        props.elements.forEach((e) => {
            values[e.name] = e.default || null;
        });

        this.state = {
            values,
            errors: {},
            submitting: false,
        };
    }

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'submit-dialog':
                this.handleSubmit();
                break;
            }
            return;
        }

        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.notifyOnCancelIfNeeded();
                break;
            }
        }
    };

    handleSubmit = async () => {
        const {elements} = this.props;
        const values = this.state.values;
        const errors = {};
        elements.forEach((elem) => {
            const error = checkDialogElementForError(elem, values[elem.name]);
            if (error) {
                errors[elem.name] = (
                    <FormattedText
                        id={error.id}
                        defaultMessage={error.defaultMessage}
                        values={error.values}
                    />
                );
            }
        });

        this.setState({errors});

        if (Object.keys(errors).length !== 0) {
            return;
        }

        const {url, callbackId, state} = this.props;

        const dialog = {
            url,
            callback_id: callbackId,
            state,
            submission: values,
        };

        const {data} = await this.props.actions.submitInteractiveDialog(dialog);

        this.submitted = true;

        if (!data || !data.errors || Object.keys(data.errors).length === 0) {
            this.handleHide();
            return;
        }

        if (checkIfErrorsMatchElements(data.errors, elements)) {
            this.setState({errors: data.errors});
            return;
        }

        this.handleHide();
    }

    notifyOnCancelIfNeeded = () => {
        if (this.submitted) {
            return;
        }

        const {url, callbackId, state, notifyOnCancel} = this.props;

        if (!notifyOnCancel) {
            return;
        }

        const dialog = {
            url,
            callback_id: callbackId,
            state,
            cancelled: true,
        };

        this.props.actions.submitInteractiveDialog(dialog);
    }

    handleHide = () => {
        this.props.navigator.pop({animated: true});
    }

    onChange = (name, value) => {
        const values = {...this.state.values, [name]: value};
        this.setState({values});
    }

    render() {
        const {elements, theme, navigator} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <ScrollView style={style.container}>
                <StatusBar/>
                {elements.map((e) => {
                    return (
                        <DialogElement
                            key={'dialogelement' + e.name}
                            displayName={e.display_name}
                            name={e.name}
                            type={e.type}
                            subtype={e.subtype}
                            helpText={e.help_text}
                            errorText={this.state.errors[e.name]}
                            placeholder={e.placeholder}
                            minLength={e.min_length}
                            maxLength={e.max_length}
                            dataSource={e.data_source}
                            optional={e.optional}
                            options={e.options}
                            value={this.state.values[e.name]}
                            onChange={this.onChange}
                            navigator={navigator}
                            theme={theme}
                        />
                    );
                })}
            </ScrollView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            marginBottom: 20,
            marginTop: 10,
        },
    };
});