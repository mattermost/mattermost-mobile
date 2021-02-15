// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {ScrollView} from 'react-native';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {checkDialogElementForError, checkIfErrorsMatchElements} from '@mm-redux/utils/integration_utils';

import ErrorText from 'app/components/error_text';
import StatusBar from 'app/components/status_bar';
import FormattedText from 'app/components/formatted_text';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {dismissModal} from 'app/actions/navigation';

import DialogIntroductionText from './dialog_introduction_text';
import {Theme} from '@mm-redux/types/preferences';
import {AppCall, AppCallResponse, AppField, AppForm, AppFormValue, AppFormValues, AppSelectOption} from '@mm-redux/types/apps';
import {DialogElement} from '@mm-redux/types/integrations';
import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import AppsFormField from './apps_form_field';

export type Props = {
    call: AppCall;
    form: AppForm;
    actions: {
        submit: (submission: {
            values: {
                [name: string]: string;
            };
        }) => Promise<{data: AppCallResponse<FormResponseData>}>;
        performLookupCall: (field: AppField, values: AppFormValues, userInput: string) => Promise<AppSelectOption[]>;
        refreshOnSelect: (field: AppField, values: AppFormValues, value: AppFormValue) => Promise<{data: AppCallResponse<any>}>;
    };
    theme: Theme;
    componentId: string;
}

type FormResponseData = {
    errors: {
        [field: string]: string;
    };
}

type State = {
    values: {[name: string]: string};
    error: string | null;
    errors: {[name: string]: React.ReactNode};
    submitting: boolean;
    form: AppForm;
}

const initFormValues = (form: AppForm): {[name: string]: string} => {
    const values: {[name: string]: any} = {};
    if (form && form.fields) {
        form.fields.forEach((f) => {
            values[f.name] = f.value || null;
        });
    }

    return values;
};

export default class AppsForm extends PureComponent<Props, State> {
    private scrollView: React.RefObject<ScrollView>;
    private navigationEventListener?: EventSubscription;
    private submitted = false;

    constructor(props: Props) {
        super(props);

        const {form} = props;
        const values = initFormValues(form);

        this.state = {
            values,
            error: null,
            errors: {},
            submitting: false,
            form,
        };

        this.scrollView = React.createRef();
    }

    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
        if (nextProps.form !== prevState.form) {
            return {
                values: initFormValues(nextProps.form),
                form: nextProps.form,
            };
        }

        return null;
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}: {buttonId: string}) {
        switch (buttonId) {
        case 'submit-form':
            this.handleSubmit();
            return;
        case 'close-dialog':
            this.handleHide();
            return;
        }

        if (buttonId.startsWith('submit-form_')) {
            this.handleSubmit(buttonId.substr('submit_form_'.length));
        }
    }

    handleSubmit = async (button?: string) => {
        const {fields} = this.props.form;
        const values = this.state.values;
        const errors: {[name: string]: React.ReactNode} = {};

        if (fields) {
            fields.forEach((field) => {
                const element = {
                    name: field.name,
                    type: field.type,
                    subtype: field.subtype,
                    optional: !field.is_required,
                } as DialogElement;
                const error = checkDialogElementForError( // TODO: make sure all required values are present in `element`
                    element,
                    values[field.name],
                );
                if (error) {
                    errors[field.name] = (
                        <FormattedText
                            id={error.id}
                            defaultMessage={error.defaultMessage}
                            values={error.values}
                        />
                    );
                }
            });
        }

        this.setState({errors});

        if (Object.keys(errors).length !== 0) {
            return;
        }

        const submission = {
            values,
        };

        if (button && this.props.form.submit_buttons) {
            submission.values[this.props.form.submit_buttons] = button;
        }

        const {data} = await this.props.actions.submit(submission);

        this.submitted = true;
        if (data?.type === 'form' && data.form) {
            this.setState({values: initFormValues(data.form)});
            return;
        }

        let hasErrors = false;

        if (data && data.type === AppCallResponseTypes.ERROR) {
            const newErrors = data.data?.errors;

            const elements = fields.map((field) => ({name: field.name})) as DialogElement[];

            if (newErrors &&
                Object.keys(newErrors).length >= 0 &&
                checkIfErrorsMatchElements(newErrors as any, elements)
            ) {
                hasErrors = true;
                this.setState({errors: newErrors});
            }

            if (data.error) {
                hasErrors = true;
                this.setState({error: data.error});
                if (this.scrollView?.current) {
                    this.scrollView.current.scrollTo({x: 0, y: 0});
                }
            }
        }

        if (!hasErrors) {
            this.handleHide();
        }
    }

    performLookup = async (name: string, userInput: string): Promise<AppSelectOption[]> => {
        const field = this.props.form.fields.find((f) => f.name === name);
        if (!field) {
            return [];
        }

        return this.props.actions.performLookupCall(field, this.state.values, userInput);
    }

    handleHide = () => {
        dismissModal();
    }

    onChange = (name: string, value: any) => {
        const field = this.props.form.fields.find((f) => f.name === name);
        if (!field) {
            return;
        }

        const values = {...this.state.values, [name]: value};

        if (field.refresh) {
            this.props.actions.refreshOnSelect(field, values, value);
        }

        this.setState({values});
    };

    render() {
        const {theme, form} = this.props;
        const {fields, header} = form;
        const {error, errors, values} = this.state;
        const style = getStyleFromTheme(theme);

        return (
            <SafeAreaView
                testID='interactive_dialog.screen'
                style={style.container}
            >
                <ScrollView
                    ref={this.scrollView}
                    style={style.scrollView}
                >
                    <StatusBar/>
                    {error && (
                        <ErrorText
                            testID='interactive_dialog.error.text'
                            textStyle={style.errorContainer}
                            error={error}
                        />
                    )}
                    {header &&
                        <DialogIntroductionText
                            value={header}
                            theme={theme}
                        />
                    }
                    {fields && fields.filter((f) => f.name !== form.submit_buttons).map((field) => {
                        return (
                            <AppsFormField
                                field={field}
                                key={field.name}
                                name={field.name}
                                errorText={errors[field.name]}
                                value={values[field.name]}
                                performLookup={this.performLookup}
                                onChange={this.onChange}
                                theme={theme}
                            />
                        );
                    })}
                </ScrollView>
            </SafeAreaView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        errorContainer: {
            marginTop: 15,
            marginLeft: 15,
            fontSize: 14,
            fontWeight: 'bold',
        },
        scrollView: {
            marginBottom: 20,
            marginTop: 10,
        },
    };
});
