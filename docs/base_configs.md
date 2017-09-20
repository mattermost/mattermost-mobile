# Base Configs
The application has a configuration JSON file to control a number of application concerns. This config holds small feature flags, generally for use in white-labeling the App.

## Options

**Profile Links**
The `ProfileLinks` array allows custom buttons to be set in a user's profile. Currently, only one type is supported: `link`. It supports i18n defaultMessage and textId. As well as any icon from `fontawesome`, `ion`, `foundation`, `material`. Finally, the `url` must be specified. You can put in any valid URL and can have `{email}` or `{username}` replaced with currently displayed profile.

Example:
```
"ProfileLinks": [
    {
        "type": "link",
        "defaultMessage": "Whober",
        "textId": "user_profile.custom_link.whober",
        "icon": "ios-person-outline",
        "iconType": "ion",
        "url": "https://www.custompage.com/{email}/view"
    }
]
```