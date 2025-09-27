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
            title: 'Simple Dialog Test',
            icon_url:
                'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
            submit_label: 'Submit Test',
            notify_on_cancel: true,
            state: 'somestate',
            elements: [
                {
                    display_name: 'Optional Text Field',
                    name: 'optional_text',
                    type: 'text',
                    default: '',
                    placeholder: 'Enter some text (optional)...',
                    help_text: 'This field is optional for basic testing',
                    optional: true,
                    min_length: 0,
                    max_length: 100,
                },
            ],
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
    const filteredOptions = searchText ?
        baseOptions.filter((option) =>
            option.text.toLowerCase().includes(searchText) ||
            option.value.toLowerCase().includes(searchText)) :
        baseOptions.slice(0, 6); // Limit to first 6 if no search

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
};
