// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

function getFullDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Title for Full Dialog Test',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            elements: [
                {
                    display_name: 'Display Name',
                    name: 'realname',
                    type: 'text',
                    subtype: '',
                    default: 'default text',
                    placeholder: 'placeholder',
                    help_text:
                        'This a regular input in an interactive dialog triggered by a test integration.',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: null,
                },
                {
                    display_name: 'Email',
                    name: 'someemail',
                    type: 'text',
                    subtype: 'email',
                    default: '',
                    placeholder: 'placeholder@bladekick.com',
                    help_text:
                        'This a regular email input in an interactive dialog triggered by a test integration.',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: null,
                },
                {
                    display_name: 'Number',
                    name: 'somenumber',
                    type: 'text',
                    subtype: 'number',
                    default: '',
                    placeholder: '',
                    help_text: '',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: null,
                },
                {
                    display_name: 'Password',
                    name: 'somepassword',
                    type: 'text',
                    subtype: 'password',
                    default: 'p@ssW0rd',
                    placeholder: 'placeholder',
                    help_text:
                        'This a password input in an interactive dialog triggered by a test integration.',
                    optional: true,
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: null,
                },
                {
                    display_name: 'Display Name Long Text Area',
                    name: 'realnametextarea',
                    type: 'textarea',
                    subtype: '',
                    default: '',
                    placeholder: 'placeholder',
                    help_text: '',
                    optional: true,
                    min_length: 5,
                    max_length: 100,
                    data_source: '',
                    options: null,
                },
                {
                    display_name: 'User Selector',
                    name: 'someuserselector',
                    type: 'select',
                    subtype: '',
                    default: '',
                    placeholder: 'Select a user...',
                    help_text: '',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: 'users',
                    options: null,
                },
                {
                    display_name: 'Channel Selector',
                    name: 'somechannelselector',
                    type: 'select',
                    subtype: '',
                    default: '',
                    placeholder: 'Select a channel...',
                    help_text: 'Choose a channel from the list.',
                    optional: true,
                    min_length: 0,
                    max_length: 0,
                    data_source: 'channels',
                    options: null,
                },
                {
                    display_name: 'Option Selector',
                    name: 'someoptionselector',
                    type: 'select',
                    subtype: '',
                    default: '',
                    placeholder: 'Select an option...',
                    help_text: '',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: [
                        {
                            text: 'Option1',
                            value: 'opt1',
                        },
                        {
                            text: 'Option2',
                            value: 'opt2',
                        },
                        {
                            text: 'Option3',
                            value: 'opt3',
                        },
                    ],
                },
                {
                    display_name: 'Radio Option Selector',
                    name: 'someradiooptions',
                    type: 'radio',
                    help_text: '',
                    optional: false,
                    options: [
                        {
                            text: 'Engineering',
                            value: 'engineering',
                        },
                        {
                            text: 'Sales',
                            value: 'sales',
                        },
                    ],
                },
                {
                    display_name: 'Boolean Selector',
                    placeholder: 'Was this modal helpful?',
                    name: 'boolean_input',
                    type: 'bool',
                    default: 'True',
                    optional: true,
                    help_text: 'This is the help text',
                },
            ],
            submit_label: 'Submit',
            notify_on_cancel: true,
            state: 'somestate',
        },
    };
}

function getSimpleDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Title for Dialog Test without elements',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'somestate',
        },
    };
}

function getUserAndChannelDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Title for Dialog Test with user and channel element',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'somestate',
            elements: [
                {
                    display_name: 'User Selector',
                    name: 'someuserselector',
                    type: 'select',
                    subtype: '',
                    default: '',
                    placeholder: 'Select a user...',
                    help_text: '',
                    optional: false,
                    min_length: 0,
                    max_length: 0,
                    data_source: 'users',
                    options: null,
                },
                {
                    display_name: 'Channel Selector',
                    name: 'somechannelselector',
                    type: 'select',
                    subtype: '',
                    default: '',
                    placeholder: 'Select a channel...',
                    help_text: 'Choose a channel from the list.',
                    optional: true,
                    min_length: 0,
                    max_length: 0,
                    data_source: 'channels',
                    options: null,
                },
            ],
        },
    };
}

function getBooleanDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Title for Dialog Test with boolean element',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'somestate',
            elements: [
                {
                    display_name: 'Boolean Selector',
                    placeholder: 'Was this modal helpful?',
                    name: 'boolean_input',
                    type: 'bool',
                    default: 'True',
                    optional: true,
                    help_text: 'This is the help text',
                },
            ],
        },
    };
}

function getTextFieldsDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'textfieldscallbackid',
            title: 'Text Fields Dialog Test',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'somestate',
            elements: [
                {
                    display_name: 'Regular Text Field',
                    name: 'text_field',
                    type: 'text',
                    default: '',
                    placeholder: 'Enter some text...',
                    help_text: 'This is a regular text input',
                    optional: true,
                    min_length: 0,
                    max_length: 100,
                },
                {
                    display_name: 'Required Text Field',
                    name: 'required_text',
                    type: 'text',
                    default: '',
                    placeholder: 'This field is required',
                    help_text: 'This field must be filled',
                    optional: false,
                    min_length: 1,
                    max_length: 50,
                },
                {
                    display_name: 'Email Field',
                    name: 'email_field',
                    type: 'text',
                    subtype: 'email',
                    default: '',
                    placeholder: 'user@example.com',
                    help_text: 'Enter a valid email address',
                    optional: true,
                    min_length: 0,
                    max_length: 100,
                },
                {
                    display_name: 'Number Field',
                    name: 'number_field',
                    type: 'text',
                    subtype: 'number',
                    default: '',
                    placeholder: '123',
                    help_text: 'Enter a number',
                    optional: true,
                    min_length: 0,
                    max_length: 10,
                },
                {
                    display_name: 'Password Field',
                    name: 'password_field',
                    type: 'text',
                    subtype: 'password',
                    default: '',
                    placeholder: 'Enter password...',
                    help_text: 'Password field test',
                    optional: true,
                    min_length: 0,
                    max_length: 50,
                },
                {
                    display_name: 'Text Area Field',
                    name: 'textarea_field',
                    type: 'text',
                    subtype: 'textarea',
                    default: '',
                    placeholder: 'Enter multiline text...',
                    help_text: 'Text area for longer content',
                    optional: true,
                    min_length: 0,
                    max_length: 500,
                },
            ],
        },
    };
}

function getMultiselectDynamicDialog(triggerId, webhookBaseUrl) {
    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'multiselect_dynamic_callback',
            title: 'Multiselect & Dynamic Dialog Test',
            icon_url: 'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            introduction_text: 'This dialog tests multiselect and dynamic select functionality',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'multiselect_dynamic_state',
            elements: [
                {
                    display_name: 'Select Multiple Users',
                    name: 'multiselect_users',
                    type: 'select',
                    data_source: 'users',
                    placeholder: 'Choose multiple users',
                    help_text: 'You can select multiple users from the list',
                    optional: false,
                    multiselect: true,
                },
                {
                    display_name: 'Select Multiple Channels',
                    name: 'multiselect_channels',
                    type: 'select',
                    data_source: 'channels',
                    placeholder: 'Choose multiple channels',
                    help_text: 'You can select multiple channels from the list',
                    optional: true,
                    multiselect: true,
                },
                {
                    display_name: 'Dynamic Options',
                    name: 'dynamic_select',
                    type: 'select',
                    data_source: 'dynamic',
                    data_source_url: `${webhookBaseUrl}/dynamic_options`,
                    placeholder: 'Type to load options dynamically',
                    help_text: 'Options are loaded dynamically from an external API',
                    optional: false,
                },
                {
                    display_name: 'Dynamic Multiselect Options',
                    name: 'dynamic_multiselect',
                    type: 'select',
                    data_source: 'dynamic',
                    data_source_url: `${webhookBaseUrl}/dynamic_multiselect_options`,
                    placeholder: 'Select multiple dynamic options',
                    help_text: 'Multiselect with dynamically loaded options',
                    optional: true,
                    multiselect: true,
                },
                {
                    display_name: 'Static Multiselect',
                    name: 'static_multiselect',
                    type: 'select',
                    placeholder: 'Choose multiple static options',
                    help_text: 'Static options with multiselect enabled',
                    optional: true,
                    multiselect: true,
                    options: [
                        {text: 'Option Alpha', value: 'alpha'},
                        {text: 'Option Beta', value: 'beta'},
                        {text: 'Option Gamma', value: 'gamma'},
                        {text: 'Option Delta', value: 'delta'},
                        {text: 'Option Epsilon', value: 'epsilon'},
                    ],
                },
            ],
        },
    };
}

function getDynamicOptionsResponse(searchText = '') {
    // Simulate dynamic option loading based on query
    const baseOptions = [
        {text: 'Project Alpha', value: 'project_alpha'},
        {text: 'Project Beta', value: 'project_beta'},
        {text: 'Project Gamma', value: 'project_gamma'},
        {text: 'Task Management', value: 'task_mgmt'},
        {text: 'User Research', value: 'user_research'},
        {text: 'Development', value: 'development'},
        {text: 'Quality Assurance', value: 'qa'},
        {text: 'Documentation', value: 'documentation'},
        {text: 'Marketing Campaign', value: 'marketing'},
        {text: 'Sales Pipeline', value: 'sales'},
    ];

    // Filter options based on search text
    const filteredOptions = searchText ?baseOptions.filter((option) =>
        option.text.toLowerCase().includes(searchText) ||
            option.value.toLowerCase().includes(searchText)) :baseOptions.slice(0, 6); // Limit to first 6 if no search

    return {
        items: filteredOptions,
    };
}

function getDynamicMultiselectOptionsResponse(query = '') {
    // Dynamic options for multiselect field
    const baseOptions = [
        {text: 'Team Lead', value: 'team_lead'},
        {text: 'Developer', value: 'developer'},
        {text: 'Designer', value: 'designer'},
        {text: 'Product Manager', value: 'product_manager'},
        {text: 'QA Engineer', value: 'qa_engineer'},
        {text: 'DevOps Engineer', value: 'devops'},
        {text: 'Business Analyst', value: 'business_analyst'},
        {text: 'Scrum Master', value: 'scrum_master'},
        {text: 'Technical Writer', value: 'tech_writer'},
        {text: 'Data Analyst', value: 'data_analyst'},
    ];

    if (!query) {
        return {
            options: baseOptions.slice(0, 6),
        };
    }

    const filtered = baseOptions.filter((option) =>
        option.text.toLowerCase().includes(query.toLowerCase()) ||
        option.value.toLowerCase().includes(query.toLowerCase()),
    );

    return {
        options: filtered,
    };
}

function getMultiformDialog(triggerId, webhookBaseUrl, step = 1) {
    const dialogs = {
        1: {
            callback_id: 'multiform_step_1',
            title: 'Personal Information - Step 1 of 3',
            introduction_text: 'Please provide your basic information',
            submit_label: 'Next Step',
            elements: [
                {
                    display_name: 'First Name',
                    name: 'first_name',
                    type: 'text',
                    placeholder: 'Enter your first name',
                    help_text: 'Your given name',
                    optional: false,
                },
                {
                    display_name: 'Email Address',
                    name: 'email',
                    type: 'text',
                    subtype: 'email',
                    placeholder: 'Enter your email address',
                    help_text: 'We will use this for notifications',
                    optional: false,
                },
            ],
        },
        2: {
            callback_id: 'multiform_step_2',
            title: 'Work Information - Step 2 of 3',
            introduction_text: 'Tell us about your work experience',
            submit_label: 'Continue',
            elements: [
                {
                    display_name: 'Department',
                    name: 'department',
                    type: 'radio',
                    help_text: 'Choose your department',
                    optional: false,
                    options: [
                        {text: 'Engineering', value: 'Engineering'},
                        {text: 'Marketing', value: 'Marketing'},
                        {text: 'Sales', value: 'Sales'},
                        {text: 'Support', value: 'Support'},
                    ],
                },
                {
                    display_name: 'Experience Level',
                    name: 'experience_level',
                    type: 'select',
                    placeholder: 'Select your experience level',
                    help_text: 'Your professional experience',
                    optional: false,
                    options: [
                        {text: 'Junior', value: 'Junior'},
                        {text: 'Mid-level', value: 'Mid-level'},
                        {text: 'Senior', value: 'Senior'},
                        {text: 'Lead', value: 'Lead'},
                    ],
                },
            ],
        },
        3: {
            callback_id: 'multiform_step_3',
            title: 'Final Details - Step 3 of 3',
            introduction_text: 'Complete your registration',
            submit_label: 'Complete Registration',
            elements: [
                {
                    display_name: 'Additional Comments',
                    name: 'comments',
                    type: 'textarea',
                    placeholder: 'Any additional information...',
                    help_text: 'Optional comments about your application',
                    optional: true,
                },
                {
                    display_name: 'Terms and Conditions',
                    name: 'terms_accepted',
                    type: 'bool',
                    help_text: 'I agree to the terms and conditions',
                    optional: false,
                },
            ],
        },
    };

    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/multiform_dialog_submit`,
        dialog: dialogs[step],
    };
}

function getFieldRefreshDialog(triggerId, webhookBaseUrl, projectType = null) {
    const baseElements = [
        {
            display_name: 'Project Name',
            name: 'project_name',
            type: 'text',
            placeholder: 'Enter project name',
            help_text: 'Name of your project',
            optional: false,
        },
        {
            display_name: 'Description',
            name: 'description',
            type: 'textarea',
            placeholder: 'Enter project description',
            help_text: 'Brief description of your project',
            optional: true,
        },
        {
            display_name: 'Project Type',
            name: 'project_type',
            type: 'select',
            placeholder: 'Select project type',
            help_text: 'Choose the type of project you want to create',
            optional: false,
            refresh: true, // This field triggers refresh
            options: [
                {text: 'Web Application', value: 'web_application'},
                {text: 'Mobile App', value: 'mobile_app'},
                {text: 'Database Application', value: 'database_app'},
                {text: 'API Service', value: 'api_service'},
                {text: 'Unknown Type', value: 'unknown_type'}, // For error testing
            ],
        },
    ];

    // Add project-type specific fields based on selection
    if (projectType === 'web_application') {
        baseElements.push(
            {
                display_name: 'Frontend Framework',
                name: 'frontend_framework',
                type: 'select',
                placeholder: 'Select frontend framework',
                optional: false,
                options: [
                    {text: 'React', value: 'React'},
                    {text: 'Vue.js', value: 'Vue.js'},
                    {text: 'Angular', value: 'Angular'},
                    {text: 'Svelte', value: 'Svelte'},
                ],
            },
            {
                display_name: 'Backend Language',
                name: 'backend_language',
                type: 'select',
                placeholder: 'Select backend language',
                optional: false,
                options: [
                    {text: 'Node.js', value: 'Node.js'},
                    {text: 'Python', value: 'Python'},
                    {text: 'Java', value: 'Java'},
                    {text: 'Go', value: 'Go'},
                ],
            },
        );
    } else if (projectType === 'mobile_app') {
        baseElements.push(
            {
                display_name: 'Platform',
                name: 'platform',
                type: 'select',
                placeholder: 'Select platform',
                optional: false,
                options: [
                    {text: 'iOS', value: 'iOS'},
                    {text: 'Android', value: 'Android'},
                    {text: 'Cross-platform', value: 'Cross-platform'},
                ],
            },
            {
                display_name: 'Development Framework',
                name: 'dev_framework',
                type: 'select',
                placeholder: 'Select development framework',
                optional: false,
                options: [
                    {text: 'React Native', value: 'React Native'},
                    {text: 'Flutter', value: 'Flutter'},
                    {text: 'Swift UI', value: 'Swift UI'},
                    {text: 'Kotlin', value: 'Kotlin'},
                ],
            },
        );
    } else if (projectType === 'database_app') {
        baseElements.push(
            {
                display_name: 'Database Type',
                name: 'database_type',
                type: 'select',
                placeholder: 'Select database type',
                optional: false,
                options: [
                    {text: 'PostgreSQL', value: 'PostgreSQL'},
                    {text: 'MySQL', value: 'MySQL'},
                    {text: 'MongoDB', value: 'MongoDB'},
                    {text: 'SQLite', value: 'SQLite'},
                ],
            },
            {
                display_name: 'Schema Migration',
                name: 'schema_migration',
                type: 'bool',
                default: 'false',
                help_text: 'Enable automatic schema migration',
                optional: false,
            },
        );
    } else if (projectType === 'api_service') {
        baseElements.push(
            {
                display_name: 'API Protocol',
                name: 'api_protocol',
                type: 'select',
                placeholder: 'Select API protocol',
                optional: false,
                options: [
                    {text: 'REST', value: 'REST'},
                    {text: 'GraphQL', value: 'GraphQL'},
                    {text: 'gRPC', value: 'gRPC'},
                ],
            },
            {
                display_name: 'Authentication Method',
                name: 'auth_method',
                type: 'select',
                placeholder: 'Select authentication method',
                optional: false,
                options: [
                    {text: 'JWT', value: 'JWT'},
                    {text: 'OAuth', value: 'OAuth'},
                    {text: 'API Key', value: 'API Key'},
                ],
            },
        );
    }

    return {
        trigger_id: triggerId,
        url: `${webhookBaseUrl}/field_refresh_dialog_submit`,
        dialog: {
            callback_id: 'field_refresh_dialog',
            title: 'Project Configuration',
            introduction_text: 'Configure your project settings',
            submit_label: 'Create Project',
            elements: baseElements,
        },
    };
}

// ****************************************************************
// mm_blocks (blocks-mode) interactive dialog fixtures
//
// Ported from the server Cypress webhook (utils/webhook_utils.js) so the
// Detox sidecar can serve the same block_dialog payloads. Dialog titles are
// capped at DialogTitleMaxLength (24) by the server.
// ****************************************************************

const MM_BLOCKS_ACTION = {
    submit: 'detox_dialog_submit',
    cancel: 'detox_dialog_cancel',
    refresh: 'detox_dialog_refresh',
    errors: 'detox_dialog_errors',
    error: 'detox_dialog_error',
    goto: 'detox_dialog_goto',
    lookup: 'detox_dialog_lookup',
    fieldRefresh: 'detox_dialog_field_refresh',
    openDetails: 'detox_dialog_open_details',
    openSummary: 'detox_dialog_open_summary',
};

function normalizeBase(webhookBaseUrl) {
    return String(webhookBaseUrl || '').replace(/\/$/, '');
}

function mmBlocksAction(base, path, context = {}) {
    return {type: 'external', url: `${base}${path}`, context};
}

/** Base submit/cancel actions; pass extras only for action ids referenced by blocks. */
function mmBlocksDialogActions(base, extras = {}) {
    return {
        [MM_BLOCKS_ACTION.submit]: mmBlocksAction(base, '/mm_blocks_dialog_submit', {form: 'blocks_dialog'}),
        [MM_BLOCKS_ACTION.cancel]: mmBlocksAction(base, '/mm_blocks_dialog_cancel', {reason: 'cancel'}),
        ...extras,
    };
}

function baseBlockDialog(webhookBaseUrl, {title, state, submitLabel, cancelLabel, blocks, actionsExtras}) {
    const base = normalizeBase(webhookBaseUrl);
    return {
        title: title || 'Detox Blocks Dialog',
        state: state || 'detox-mm-blocks-dialog',
        submit: {action: MM_BLOCKS_ACTION.submit, label: submitLabel || 'Submit'},
        cancel: {action: MM_BLOCKS_ACTION.cancel, label: cancelLabel || 'Cancel'},
        blocks,
        actions: mmBlocksDialogActions(base, actionsExtras),
    };
}

/** OpenDialogRequest for mm_blocks dialogs, with every supported field type. */
function getMmBlocksDialog(triggerId, webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    const marker = options.marker || '';

    return {
        trigger_id: triggerId,
        block_dialog: {
            ...baseBlockDialog(webhookBaseUrl, {
                title: options.title || 'Detox Blocks Dialog',
                state: options.state || 'detox-mm-blocks-dialog',
                submitLabel: options.submitLabel,
                cancelLabel: options.cancelLabel,
                blocks: [
                    {
                        type: 'text',
                        text: marker ?`Blocks dialog for **${marker}**. Fill fields, then Submit / Next step / Show errors.` :'Blocks dialog — fill fields, then Submit / Next step / Show errors.',
                    },
                    {type: 'divider'},
                    {
                        type: 'text_input',
                        name: 'title',
                        label: 'Title',
                        placeholder: 'Short title',
                        help_text: 'Required for a successful submit.',
                        initial_value: 'Demo ticket',
                        max_length: 80,
                    },
                    {
                        type: 'text_input',
                        name: 'email',
                        label: 'Email',
                        subtype: 'email',
                        placeholder: 'you@example.com',
                        optional: true,
                    },
                    {
                        type: 'text_input',
                        name: 'description',
                        label: 'Description',
                        multiline: true,
                        placeholder: 'Longer text…',
                        optional: true,
                        max_length: 500,
                    },
                    {
                        type: 'bool_input',
                        name: 'enabled',
                        label: 'Enabled',
                        placeholder: 'Turn this on',
                        initial_value: true,
                    },
                    {
                        type: 'select',
                        name: 'priority',
                        label: 'Priority',
                        placeholder: 'Choose priority',
                        options: [
                            {text: 'Low', value: 'low'},
                            {text: 'Medium', value: 'medium'},
                            {text: 'High', value: 'high'},
                        ],
                        initial_option: 'medium',
                    },
                    {
                        type: 'select',
                        name: 'severity',
                        label: 'Severity',
                        style: 'expanded',
                        options: [
                            {text: 'SEV-1', value: 'sev1'},
                            {text: 'SEV-2', value: 'sev2'},
                        ],
                        initial_option: 'sev2',
                    },
                    {
                        type: 'select',
                        name: 'pick',
                        label: 'Dynamic option',
                        placeholder: 'Type to search…',
                        data_source: 'dynamic',
                        data_source_action: MM_BLOCKS_ACTION.lookup,
                        optional: true,
                        help_text: 'Options from lookup integration.',
                    },
                    {
                        type: 'date_input',
                        name: 'due_date',
                        label: 'Due date',
                        optional: true,
                        placeholder: 'Pick a due date',
                        initial_value: '2025-01-10',
                    },
                    {
                        type: 'datetime_input',
                        name: 'meeting_at',
                        label: 'Meeting time',
                        optional: true,
                    },
                    {
                        type: 'file_input',
                        name: 'attachments',
                        label: 'Attachments',
                        optional: true,
                        placeholder: 'Upload evidence',
                        help_text: 'Optional file upload.',
                    },
                    {type: 'divider'},
                    {
                        type: 'container',
                        flow: 'horizontal',
                        gap: 'medium',
                        content: [
                            {
                                type: 'button',
                                text: 'Next step',
                                style: 'default',
                                subtype: 'submit',
                                action_id: MM_BLOCKS_ACTION.refresh,
                            },
                            {
                                type: 'button',
                                text: 'Show errors',
                                style: 'danger',
                                subtype: 'submit',
                                action_id: MM_BLOCKS_ACTION.errors,
                            },
                            {
                                type: 'button',
                                text: 'Top-level error',
                                style: 'danger',
                                action_id: MM_BLOCKS_ACTION.error,
                            },
                            {
                                type: 'button',
                                text: 'Navigate away',
                                style: 'default',
                                action_id: MM_BLOCKS_ACTION.goto,
                            },
                        ],
                    },
                ],
                actionsExtras: {
                    [MM_BLOCKS_ACTION.refresh]: mmBlocksAction(base, '/mm_blocks_dialog_refresh', {scenario: 'refresh'}),
                    [MM_BLOCKS_ACTION.errors]: mmBlocksAction(base, '/mm_blocks_dialog_errors'),
                    [MM_BLOCKS_ACTION.error]: mmBlocksAction(base, '/mm_blocks_dialog_error'),
                    [MM_BLOCKS_ACTION.goto]: mmBlocksAction(base, '/mm_blocks_dialog_goto'),
                    [MM_BLOCKS_ACTION.lookup]: mmBlocksAction(base, '/mm_blocks_integration_lookup'),
                },
            }),
        },
    };
}

/** In-place refresh block_dialog body (returned as type:refresh). */
function getMmBlocksDialogStep2(webhookBaseUrl, previousTitle) {
    const base = normalizeBase(webhookBaseUrl);
    const title = previousTitle || 'Demo ticket';

    return {
        title: 'Step 2',
        state: 'detox-mm-blocks-dialog-step-2',
        submit: {action: MM_BLOCKS_ACTION.submit, label: 'Finish'},
        cancel: {action: MM_BLOCKS_ACTION.cancel, label: 'Cancel'},
        blocks: [
            {
                type: 'text',
                text: `**Step 2** — refreshed from dialog. Previous title: \`${title}\``,
            },
            {
                type: 'text_input',
                name: 'notes',
                label: 'Follow-up notes',
                multiline: true,
                placeholder: 'Anything else?',
            },
            {
                type: 'bool_input',
                name: 'confirm',
                label: 'Confirm',
                placeholder: 'I confirm this step',
                initial_value: false,
            },
        ],
        actions: {
            [MM_BLOCKS_ACTION.submit]: mmBlocksAction(base, '/mm_blocks_dialog_submit', {step: '2'}),
            [MM_BLOCKS_ACTION.cancel]: mmBlocksAction(base, '/mm_blocks_dialog_cancel', {reason: 'cancel', step: '2'}),
        },
    };
}

function getMmBlocksSimpleDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Simple Dialog',
        state: 'detox-simple',
        blocks: [
            {
                type: 'text',
                text: options.marker ?`Simple blocks dialog for **${options.marker}**.` :'Simple blocks dialog with no form fields.',
            },
        ],
    });
}

function getMmBlocksFullDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Full Dialog',
        state: 'detox-full',
        blocks: [
            {type: 'text', text: options.marker ? `Full dialog **${options.marker}**` : 'Full field mix.'},
            {
                type: 'text_input',
                name: 'realname',
                label: 'Name',
                placeholder: 'Enter your name',
                help_text: 'Your full name.',
            },
            {
                type: 'text_input',
                name: 'someemail',
                label: 'Email',
                subtype: 'email',
                placeholder: 'you@example.com',
                optional: true,
            },
            {
                type: 'text_input',
                name: 'somenumber',
                label: 'Number',
                subtype: 'number',
                placeholder: 'Enter a number',
                optional: true,
            },
            {
                type: 'text_input',
                name: 'somepassword',
                label: 'Password',
                subtype: 'password',
                placeholder: 'Enter password',
                optional: true,
            },
            {
                type: 'text_input',
                name: 'realnametextarea',
                label: 'Notes',
                multiline: true,
                placeholder: 'Longer text…',
                optional: true,
            },
            {
                type: 'select',
                name: 'someuserselector',
                label: 'User',
                data_source: 'users',
                placeholder: 'Select a user…',
                optional: true,
            },
            {
                type: 'select',
                name: 'somechannelselector',
                label: 'Channel',
                data_source: 'channels',
                placeholder: 'Select a channel…',
                optional: true,
            },
            {
                type: 'select',
                name: 'someoptionselector',
                label: 'Option',
                placeholder: 'Select an option…',
                options: [
                    {text: 'Option1', value: 'opt1'},
                    {text: 'Option2', value: 'opt2'},
                    {text: 'Option3', value: 'opt3'},
                ],
                optional: true,
            },
            {
                type: 'select',
                name: 'someradiooptions',
                label: 'Radio Option',
                style: 'expanded',
                options: [
                    {text: 'Engineering', value: 'engineering'},
                    {text: 'Sales', value: 'sales'},
                ],
                optional: true,
            },
            {
                type: 'bool_input',
                name: 'boolean_input',
                label: 'Boolean Selector',
                placeholder: 'Was this modal helpful?',
                help_text: 'This is the help text',
                initial_value: true,
                optional: true,
            },
        ],
    });
}

function getMmBlocksBooleanDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Boolean Dialog',
        state: 'detox-boolean',
        blocks: [
            {
                type: 'bool_input',
                name: 'boolean_input',
                label: 'Boolean Selector',
                placeholder: 'Was this modal helpful?',
                help_text: 'This is the help text',
                initial_value: true,
                optional: true,
            },
        ],
    });
}

function getMmBlocksUsersChannelsDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Users Channels',
        state: 'detox-users-channels',
        blocks: [
            {
                type: 'select',
                name: 'someuserselector',
                label: 'User Selector',
                data_source: 'users',
                placeholder: 'Select a user…',
            },
            {
                type: 'select',
                name: 'somechannelselector',
                label: 'Channel Selector',
                data_source: 'channels',
                placeholder: 'Select a channel…',
                help_text: 'Choose a channel from the list.',
                optional: true,
            },
        ],
    });
}

function getMmBlocksMultiselectDialog(webhookBaseUrl, options = {}) {
    const includeDefaults = Boolean(options.includeDefaults);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Multiselect',
        state: 'detox-multiselect',
        blocks: [
            {
                type: 'select',
                name: 'multiselect_options',
                label: 'Multi Option Selector',
                multiselect: true,
                placeholder: 'Select multiple options…',
                help_text: 'You can select multiple options from this list.',
                initial_options: includeDefaults ? ['opt1', 'opt3'] : undefined,
                options: [
                    {text: 'Engineering', value: 'opt1'},
                    {text: 'Sales', value: 'opt2'},
                    {text: 'Marketing', value: 'opt3'},
                    {text: 'Support', value: 'opt4'},
                    {text: 'Product', value: 'opt5'},
                ],
            },
            {
                type: 'select',
                name: 'multiselect_users',
                label: 'Multi User Selector',
                multiselect: true,
                data_source: 'users',
                placeholder: 'Select multiple users…',
                help_text: 'Choose multiple users from the team.',
            },
            {
                type: 'select',
                name: 'single_select_options',
                label: 'Single Option Selector',
                placeholder: 'Select one option…',
                options: [
                    {text: 'Engineering', value: 'opt1'},
                    {text: 'Sales', value: 'opt2'},
                    {text: 'Marketing', value: 'opt3'},
                ],
                optional: true,
            },
        ],
    });
}

function getMmBlocksDynamicDialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Dynamic Select',
        state: 'detox-dynamic',
        blocks: [
            {
                type: 'select',
                name: 'dynamic_role_selector',
                label: 'Role',
                placeholder: 'Type to search roles…',
                data_source: 'dynamic',
                data_source_action: MM_BLOCKS_ACTION.lookup,
                help_text: 'Required dynamic select.',
            },
            {
                type: 'select',
                name: 'optional_dynamic_selector',
                label: 'Optional Role',
                placeholder: 'Optional search…',
                data_source: 'dynamic',
                data_source_action: MM_BLOCKS_ACTION.lookup,
                optional: true,
                initial_option: 'opt_beta',
                help_text: 'Optional dynamic select with default.',
            },
        ],
        actionsExtras: {
            [MM_BLOCKS_ACTION.lookup]: mmBlocksAction(base, '/mm_blocks_integration_lookup'),
        },
    });
}

function getMmBlocksEmptyRequiredDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Required Fields',
        state: 'detox-required',
        blocks: [
            {
                type: 'text_input',
                name: 'realname',
                label: 'Name',
                placeholder: 'Enter your name',
            },
            {
                type: 'text_input',
                name: 'someemail',
                label: 'Email',
                subtype: 'email',
                placeholder: 'you@example.com',
            },
            {
                type: 'text_input',
                name: 'somenumber',
                label: 'Number',
                subtype: 'number',
                placeholder: 'Enter a number',
            },
            {
                type: 'text_input',
                name: 'somepassword',
                label: 'Password',
                subtype: 'password',
                placeholder: 'Enter password',
                optional: true,
            },
            {
                type: 'bool_input',
                name: 'boolean_input',
                label: 'Boolean Selector',
                placeholder: 'Was this modal helpful?',
                help_text: 'This is the help text',
                initial_value: true,
                optional: true,
            },
        ],
    });
}

function getMmBlocksFileUploadDialog(webhookBaseUrl, options = {}) {
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox File Upload',
        state: 'detox-file-upload',
        submitLabel: 'Submit Files',
        blocks: [
            {
                type: 'file_input',
                name: 'single_document',
                label: 'Upload Single Document',
                placeholder: 'Select one document…',
                help_text: 'Upload a single document (replaces previous selection).',
            },
            {
                type: 'file_input',
                name: 'multiple_files',
                label: 'Upload Multiple Files',
                allow_multiple: true,
                placeholder: 'Select multiple files…',
                help_text: 'Upload multiple files (can select and add more).',
            },
            {
                type: 'text_input',
                name: 'description',
                label: 'Description',
                multiline: true,
                placeholder: 'Describe the uploaded files…',
                optional: true,
                max_length: 500,
            },
        ],
    });
}

function getMmBlocksFieldRefreshDialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    const projectName = options.projectName || '';
    const projectType = options.projectType || '';
    const blocks = [
        {type: 'text', text: 'Enter project name then select type to see different fields'},
        {
            type: 'text_input',
            name: 'project_name',
            label: 'Project Name',
            placeholder: 'Enter project name',
            initial_value: projectName || undefined,
        },
        {
            type: 'select',
            name: 'project_type',
            label: 'Project Type',
            placeholder: 'Select project type…',
            onChange: MM_BLOCKS_ACTION.fieldRefresh,
            initial_option: projectType || undefined,
            options: [
                {text: 'Web Application', value: 'web'},
                {text: 'Mobile App', value: 'mobile'},
                {text: 'API Service', value: 'api'},
            ],
        },
    ];

    if (projectType === 'web') {
        blocks.push({
            type: 'select',
            name: 'framework',
            label: 'Framework',
            placeholder: 'Select framework…',
            options: [
                {text: 'React', value: 'react'},
                {text: 'Vue', value: 'vue'},
                {text: 'Angular', value: 'angular'},
            ],
            optional: true,
        });
    } else if (projectType === 'mobile') {
        blocks.push({
            type: 'select',
            name: 'platform',
            label: 'Platform',
            placeholder: 'Select platform…',
            options: [
                {text: 'iOS', value: 'ios'},
                {text: 'Android', value: 'android'},
                {text: 'React Native', value: 'react-native'},
            ],
            optional: true,
        });
    } else if (projectType === 'api') {
        blocks.push({
            type: 'select',
            name: 'language',
            label: 'Language',
            placeholder: 'Select language…',
            options: [
                {text: 'Go', value: 'go'},
                {text: 'Node.js', value: 'nodejs'},
                {text: 'Python', value: 'python'},
            ],
            optional: true,
        });
    }

    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Field Refresh Demo',
        state: 'detox-field-refresh',
        blocks,
        actionsExtras: {
            [MM_BLOCKS_ACTION.fieldRefresh]: mmBlocksAction(base, '/mm_blocks_dialog_field_refresh'),
        },
    });
}

function getMmBlocksMultistep1Dialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Step 1 - Personal Info',
        state: 'step1',
        submitLabel: 'Next Step',
        blocks: [
            {type: 'text', text: 'Multi-step registration - Step 1 of 3'},
            {
                type: 'text_input',
                name: 'first_name',
                label: 'First Name',
                placeholder: 'Enter your first name',
            },
            {
                type: 'text_input',
                name: 'email',
                label: 'Email',
                subtype: 'email',
                placeholder: 'Enter your email address',
            },
        ],
        actionsExtras: {
            [MM_BLOCKS_ACTION.submit]: mmBlocksAction(base, '/mm_blocks_dialog_multistep', {step: '1'}),
        },
    });
}

function getMmBlocksMultistep2Dialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Step 2 - Work Info',
        state: 'step2',
        submitLabel: 'Next Step',
        blocks: [
            {type: 'text', text: 'Multi-step registration - Step 2 of 3'},
            {
                type: 'select',
                name: 'department',
                label: 'Department',
                placeholder: 'Select department…',
                options: [
                    {text: 'Engineering', value: 'engineering'},
                    {text: 'Marketing', value: 'marketing'},
                    {text: 'Sales', value: 'sales'},
                ],
            },
            {
                type: 'select',
                name: 'experience_level',
                label: 'Experience Level',
                style: 'expanded',
                options: [
                    {text: 'Junior', value: 'junior'},
                    {text: 'Mid-level', value: 'mid'},
                    {text: 'Senior', value: 'senior'},
                ],
            },
        ],
        actionsExtras: {
            [MM_BLOCKS_ACTION.submit]: mmBlocksAction(base, '/mm_blocks_dialog_multistep', {step: '2'}),
        },
    });
}

function getMmBlocksMultistep3Dialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Step 3 - Final Details',
        state: 'step3',
        submitLabel: 'Complete Registration',
        blocks: [
            {type: 'text', text: 'Multi-step registration - Step 3 of 3'},
            {
                type: 'text_input',
                name: 'comments',
                label: 'Comments',
                multiline: true,
                placeholder: 'Any additional comments…',
                optional: true,
            },
            {
                type: 'bool_input',
                name: 'terms_accepted',
                label: 'Terms & Conditions',
                placeholder: 'I accept the terms',
            },
        ],
        actionsExtras: {
            [MM_BLOCKS_ACTION.submit]: mmBlocksAction(base, '/mm_blocks_dialog_submit', {step: '3', form: 'multistep'}),
        },
    });
}

function getMmBlocksChildContentDialog(webhookBaseUrl, source) {
    const label = source || 'Unknown';
    return baseBlockDialog(webhookBaseUrl, {
        title: `${label} Dialog`.slice(0, 24),
        state: `detox-child-${label}`,
        blocks: [
            {
                type: 'text',
                text: `This view was opened from the **${label}** button (stacked modal via dialogs/open).`,
            },
            {
                type: 'text_input',
                name: 'child_input',
                label: 'Child Input',
                placeholder: 'Enter value',
                optional: true,
            },
        ],
    });
}

/** OpenDialogRequest wrapper so a child block_dialog can be stacked on a parent. */
function getMmBlocksChildOpenRequest(triggerId, webhookBaseUrl, source) {
    return {
        trigger_id: triggerId,
        block_dialog: getMmBlocksChildContentDialog(webhookBaseUrl, source),
    };
}

function getMmBlocksActionParentDialog(webhookBaseUrl, options = {}) {
    const base = normalizeBase(webhookBaseUrl);
    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox Action Buttons',
        state: 'detox-action-parent',
        blocks: [
            {
                type: 'text_input',
                name: 'your_name',
                label: 'Your Name',
                placeholder: 'Enter your name',
                optional: true,
            },
            {
                type: 'container',
                flow: 'horizontal',
                gap: 'medium',
                content: [
                    {
                        type: 'button',
                        text: 'Open Details',
                        style: 'primary',
                        action_id: MM_BLOCKS_ACTION.openDetails,
                    },
                    {
                        type: 'button',
                        text: 'Open Summary',
                        style: 'default',
                        action_id: MM_BLOCKS_ACTION.openSummary,
                    },
                ],
            },
        ],
        actionsExtras: {
            [MM_BLOCKS_ACTION.openDetails]: mmBlocksAction(base, '/mm_blocks_dialog_child', {source: 'Details'}),
            [MM_BLOCKS_ACTION.openSummary]: mmBlocksAction(base, '/mm_blocks_dialog_child', {source: 'Summary'}),
        },
    });
}

function getMmBlocksDatetimeDialog(webhookBaseUrl, scenario, options = {}) {
    let blocks;

    switch (scenario) {
        case 'datetime_basic':
            blocks = [
                {
                    type: 'date_input',
                    name: 'event_date',
                    label: 'Event Date',
                    placeholder: 'Select a date',
                    help_text: 'Select the date for your event',
                },
                {
                    type: 'datetime_input',
                    name: 'meeting_time',
                    label: 'Meeting Time',
                    placeholder: 'Select date and time',
                    help_text: 'Select the date and time for your meeting',
                    optional: true,
                    datetime_config: {time_interval: 60},
                },
            ];
            break;
        case 'datetime_mindate':
            blocks = [
                {
                    type: 'date_input',
                    name: 'future_date',
                    label: 'Future Date Only',
                    placeholder: 'Select a future date',
                    help_text: 'Must be today or later',
                    optional: true,
                    datetime_config: {min_date: 'today'},
                },
            ];
            break;
        case 'datetime_interval':
            blocks = [
                {
                    type: 'datetime_input',
                    name: 'interval_time',
                    label: 'Custom Interval Time',
                    placeholder: 'Select time (30min intervals)',
                    help_text: 'Time picker with 30-minute intervals',
                    optional: true,
                    datetime_config: {time_interval: 30},
                },
            ];
            break;
        case 'datetime_relative':
            blocks = [
                {
                    type: 'date_input',
                    name: 'relative_date',
                    label: 'Relative Date Example',
                    placeholder: 'Today by default',
                    help_text: 'Defaults to today using relative date',
                    optional: true,
                    initial_value: 'today',
                },
                {
                    type: 'datetime_input',
                    name: 'relative_datetime',
                    label: 'Relative DateTime Example',
                    placeholder: 'Tomorrow by default',
                    help_text: 'Defaults to tomorrow using relative date',
                    optional: true,
                    initial_value: '+1d',
                },
            ];
            break;
        case 'datetime_timezone':
            blocks = [
                {
                    type: 'datetime_input',
                    name: 'london_dropdown',
                    label: 'London Office Hours',
                    help_text: 'Times shown in GMT - select from 60 min intervals',
                    optional: true,
                    datetime_config: {
                        location_timezone: 'Europe/London',
                        time_interval: 60,
                    },
                },
            ];
            break;
        case 'datetime_manual':
            blocks = [
                {
                    type: 'datetime_input',
                    name: 'local_manual',
                    label: 'Your Local Time',
                    help_text: 'Type any time: 9am, 14:30, 3:45pm - no rounding',
                    optional: true,
                    datetime_config: {manual_time_entry: true},
                },
                {
                    type: 'datetime_input',
                    name: 'london_manual',
                    label: 'London Manual Entry',
                    help_text: 'Type time in GMT: 9am, 14:30, 3:45pm - no rounding',
                    optional: true,
                    datetime_config: {
                        location_timezone: 'Europe/London',
                        manual_time_entry: true,
                    },
                },
            ];
            break;
        default:
            blocks = [
                {
                    type: 'date_input',
                    name: 'event_date',
                    label: 'Event Date',
                    placeholder: 'Select a date',
                    optional: true,
                },
            ];
    }

    return baseBlockDialog(webhookBaseUrl, {
        title: options.title || 'Detox DateTime',
        state: `detox-${scenario}`,
        blocks,
    });
}

/** Resolve a block_dialog fixture by scenario key sent as context.scenario. */
function getMmBlocksDialogByScenario(webhookBaseUrl, scenario, options = {}) {
    switch (scenario) {
        case 'simple':
            return getMmBlocksSimpleDialog(webhookBaseUrl, options);
        case 'full':
            return getMmBlocksFullDialog(webhookBaseUrl, options);
        case 'boolean':
            return getMmBlocksBooleanDialog(webhookBaseUrl, options);
        case 'users_channels':
            return getMmBlocksUsersChannelsDialog(webhookBaseUrl, options);
        case 'multiselect':
            return getMmBlocksMultiselectDialog(webhookBaseUrl, {...options, includeDefaults: false});
        case 'multiselect_defaults':
            return getMmBlocksMultiselectDialog(webhookBaseUrl, {...options, includeDefaults: true});
        case 'dynamic':
            return getMmBlocksDynamicDialog(webhookBaseUrl, options);
        case 'empty_required':
            return getMmBlocksEmptyRequiredDialog(webhookBaseUrl, options);
        case 'file_upload':
            return getMmBlocksFileUploadDialog(webhookBaseUrl, options);
        case 'field_refresh':
            return getMmBlocksFieldRefreshDialog(webhookBaseUrl, options);
        case 'multistep_1':
            return getMmBlocksMultistep1Dialog(webhookBaseUrl, options);
        case 'multistep_2':
            return getMmBlocksMultistep2Dialog(webhookBaseUrl, options);
        case 'multistep_3':
            return getMmBlocksMultistep3Dialog(webhookBaseUrl, options);
        case 'action_parent':
            return getMmBlocksActionParentDialog(webhookBaseUrl, options);
        case 'datetime_basic':
        case 'datetime_mindate':
        case 'datetime_interval':
        case 'datetime_relative':
        case 'datetime_timezone':
        case 'datetime_manual':
            return getMmBlocksDatetimeDialog(webhookBaseUrl, scenario, options);
        default:
            return getMmBlocksDialog('unused', webhookBaseUrl, options).block_dialog;
    }
}

/** Lookup items served for select fields with data_source=dynamic. */
function getMmBlocksLookupOptions(searchText = '') {
    const allOptions = [
        {text: 'Alpha', value: 'opt_alpha'},
        {text: 'Beta', value: 'opt_beta'},
        {text: 'Gamma', value: 'opt_gamma'},
        {text: 'Mattermost', value: 'opt_mm'},
    ];

    const search = String(searchText || '').toLowerCase();
    if (!search) {
        return allOptions;
    }

    return allOptions.filter((option) =>
        option.text.toLowerCase().includes(search) ||
        option.value.toLowerCase().includes(search));
}

module.exports = {
    getFullDialog,
    getSimpleDialog,
    getUserAndChannelDialog,
    getBooleanDialog,
    getTextFieldsDialog,
    getMultiselectDynamicDialog,
    getDynamicOptionsResponse,
    getDynamicMultiselectOptionsResponse,
    getMultiformDialog,
    getFieldRefreshDialog,
    getMmBlocksDialog,
    getMmBlocksDialogStep2,
    getMmBlocksDialogByScenario,
    getMmBlocksFieldRefreshDialog,
    getMmBlocksMultistep1Dialog,
    getMmBlocksMultistep2Dialog,
    getMmBlocksMultistep3Dialog,
    getMmBlocksChildContentDialog,
    getMmBlocksChildOpenRequest,
    getMmBlocksLookupOptions,
    MM_BLOCKS_ACTION,
};
