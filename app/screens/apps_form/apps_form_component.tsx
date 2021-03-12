// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
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
import {AppCallRequest, AppCallResponse, AppField, AppForm, AppFormValue, AppFormValues, AppLookupResponse, AppSelectOption, FormResponseData} from '@mm-redux/types/apps';
import {DialogElement} from '@mm-redux/types/integrations';
import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import AppsFormField from './apps_form_field';

export type Props = {
    call: AppCallRequest;
    form: AppForm;
    actions: {
        submit: (submission: {
            values: {
                [name: string]: string;
            };
        }) => Promise<{data: AppCallResponse<FormResponseData>, error?: Error}>;
        performLookupCall: (field: AppField, values: AppFormValues, userInput: string) => Promise<{data: AppCallResponse<AppLookupResponse>, error?: Error}>;
        refreshOnSelect: (field: AppField, values: AppFormValues, value: AppFormValue) => Promise<{data: AppCallResponse<FormResponseData>, error?: Error}>;
    };
    theme: Theme;
    componentId: string;
}

type State = {
    values: {[name: string]: string};
    formError: string | null;
    fieldErrors: {[name: string]: React.ReactNode};
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

export default class AppsFormComponent extends PureComponent<Props, State> {
    private scrollView: React.RefObject<ScrollView>;
    navigationEventListener?: EventSubscription;

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props: Props) {
        super(props);

        const {form} = props;
        const values = initFormValues(form);

        this.state = {
            values,
            formError: null,
            fieldErrors: {},
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
            this.handleSubmit(buttonId.substr('submit-form_'.length));
        }
    }

    handleSubmit = async (button?: string) => {
        const {fields} = this.props.form;
        const values = this.state.values;
        const fieldErrors: {[name: string]: React.ReactNode} = {};

        const elements = fieldsAsElements(fields);
        elements?.forEach((element) => {
            const error = checkDialogElementForError( // TODO: make sure all required values are present in `element`
                element,
                values[element.name],
            );
            if (error) {
                fieldErrors[element.name] = (
                    <FormattedText
                        id={error.id}
                        defaultMessage={error.defaultMessage}
                        values={error.values}
                    />
                );
            }
        });

        this.setState({fieldErrors});

        if (Object.keys(fieldErrors).length !== 0) {
            return;
        }

        const submission = {
            values,
        };

        if (button && this.props.form.submit_buttons) {
            submission.values[this.props.form.submit_buttons] = button;
        }

        const {data, error} = await this.props.actions.submit(submission);
        if (data?.type === AppCallResponseTypes.FORM && data.form) {
            return;
        }

        let hasErrors = false;
        const errorMessage = error?.message;
        if (data && data.type === AppCallResponseTypes.ERROR) {
            hasErrors = this.updateErrors(elements, data.data?.errors, errorMessage);
        }

        if (!hasErrors) {
            this.handleHide();
        }
    }

    updateErrors = (elements: DialogElement[], fieldErrors?: {[x: string]: string}, formError?: string): boolean => {
        let hasErrors = false;

        if (fieldErrors &&
            Object.keys(fieldErrors).length >= 0 &&
            checkIfErrorsMatchElements(fieldErrors as any, elements)
        ) {
            hasErrors = true;
            this.setState({fieldErrors});
        }

        if (formError) {
            hasErrors = true;
            this.setState({formError});
            if (this.scrollView?.current) {
                this.scrollView.current.scrollTo({x: 0, y: 0});
            }
        }

        return hasErrors;
    }

    performLookup = async (name: string, userInput: string): Promise<AppSelectOption[]> => {
        const intl = this.context.intl;
        const field = this.props.form.fields.find((f) => f.name === name);
        if (!field) {
            return [];
        }

        const res = await this.props.actions.performLookupCall(field, this.state.values, userInput);
        const callResp = res.data;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            return res.data.data?.items || [];
        case AppCallResponseTypes.FORM:
        case AppCallResponseTypes.NAVIGATE: {
            const errMsg = intl.formatMessage({
                id: 'apps.error.responses.unexpected_type',
                defaultMessage: 'App response type was not expected. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            );
            this.setState({
                fieldErrors: {
                    ...this.state.fieldErrors,
                    [field.name]: errMsg,
                },
            });
            return [];
        }
        case AppCallResponseTypes.ERROR: {
            const errMsg = callResp.error || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error.',
            });
            this.setState({
                fieldErrors: {
                    ...this.state.fieldErrors,
                    [field.name]: errMsg,
                },
            });
            return [];
        }
        default: {
            const errMsg = intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            },
            );
            this.setState({
                fieldErrors: {
                    ...this.state.fieldErrors,
                    [field.name]: errMsg,
                },
            });
            return [];
        }
        }
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
            this.props.actions.refreshOnSelect(field, values, value).then(({data, error}) => {
                if (data.type !== AppCallResponseTypes.ERROR) {
                    return;
                }

                const errorMsg = error?.message;
                const errors = data.data?.errors;
                const elements = fieldsAsElements(this.props.form.fields);
                this.updateErrors(elements, errors, errorMsg);
            });
        }

        this.setState({values});
    };

    render() {
        const {theme, form} = this.props;
        const {fields, header} = form;
        const {formError, fieldErrors, values} = this.state;
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
                    {formError && (
                        <ErrorText
                            testID='interactive_dialog.error.text'
                            textStyle={style.errorContainer}
                            error={formError}
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
                                errorText={fieldErrors[field.name]}
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

function fieldsAsElements(fields?: AppField[]): DialogElement[] {
    return fields?.map((f) => ({
        name: f.name,
        type: f.type,
        subtype: f.subtype,
        optional: !f.is_required,
    })) as DialogElement[];
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
