// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mattermostBucket from '@app/mattermost_bucket';
import {GlobalStyles} from '@app/styles';
import telemetry from '@app/telemetry';
import LocalConfig from '@assets/config';
import {Client4} from '@client/rest';
import AppVersion from '@components/app_version';
import ErrorText from '@components/error_text';
import FormattedText from '@components/formatted_text';

import fetchConfig from '@init/fetch';
import globalEventHandler from '@init/global_event_handler';
import withObservables from '@nozbe/with-observables';
import {goToScreen, resetToChannel} from '@requests/local/navigation';
import {Styles} from '@typings/utils';
import {checkUpgradeType, isUpgradeAvailable} from '@utils/client_upgrade';
import {isMinimumServerVersion} from '@utils/helpers';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';
import tracker from '@utils/time_tracker';
import {isValidUrl, stripTrailingSlashes} from '@utils/url';
import merge from 'deepmerge';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    EmitterSubscription,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Button from 'react-native-button';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import RNFetchBlob from 'rn-fetch-blob';
import urlParse from 'url-parse';
import {getSystems} from '@queries/system';

//todo: Once you get a URL and a NAME for a server, you have to init a database and then set it as the currenly active server database.  All subsequent calls/queries will use it.

type ScreenProps = {};

type ScreenState = {
  connected: boolean;
  connecting: boolean;
  error: null | Error;
};

class SelectServer extends PureComponent<ScreenProps, ScreenState> {
  static propTypes = {
      actions: PropTypes.shape({
          getPing: PropTypes.func.isRequired,
          handleServerUrlChanged: PropTypes.func.isRequired,
          loadConfigAndLicense: PropTypes.func.isRequired,
          login: PropTypes.func.isRequired,
          resetPing: PropTypes.func.isRequired,
          scheduleExpiredNotification: PropTypes.func.isRequired,
          setLastUpgradeCheck: PropTypes.func.isRequired,
          setServerVersion: PropTypes.func.isRequired,
      }).isRequired,
      allowOtherServers: PropTypes.bool,
      config: PropTypes.object,
      currentVersion: PropTypes.string,
      deepLinkURL: PropTypes.string,
      hasConfigAndLicense: PropTypes.bool.isRequired,
      latestVersion: PropTypes.string,
      license: PropTypes.object,
      minVersion: PropTypes.string,
      serverUrl: PropTypes.string.isRequired,
  };

  //fixme:  From which table would this value normally come from ?
  static defaultProps = {
      allowOtherServers: true,
  };

  //fixme: ??
  // static contextTypes = {
  //     intl: IntlShape.isRequired,
  // };

  private cancelPing: (() => void) | null | undefined;
  private navigationEventListener: EventSubscription | undefined;
  private certificateListener: EmitterSubscription | undefined;
  private sslProblemListener: EmitterSubscription | undefined;
  private textInput: TextInput | undefined;

  state: ScreenState = {
      connected: false,
      connecting: false,
      error: null,
  };

  static getDerivedStateFromProps(props, state) {
      if (
          state.url === undefined &&
      props.allowOtherServers &&
      props.deepLinkURL
      ) {
          const url = urlParse(props.deepLinkURL).host;
          return {url};
      } else if (state.url === undefined && props.serverUrl) {
          return {url: props.serverUrl};
      }
      return null;
  }

  componentDidMount() {
      this.navigationEventListener = Navigation.events().bindComponent(this);

      const {allowOtherServers, serverUrl} = this.props;
      if (!allowOtherServers && serverUrl) {
      // If the app is managed or AutoSelectServerUrl is true in the Config, the server url is set and the user can't change it
      // we automatically trigger the ping to move to the next screen
          this.handleConnect();
      }

      if (Platform.OS === 'android') {
          Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
      }

      this.certificateListener = DeviceEventEmitter.addListener(
          'RNFetchBlobCertificate',
          this.selectCertificate,
      );
      this.sslProblemListener = DeviceEventEmitter.addListener(
          'RNFetchBlobSslProblem',
          this.handleSslProblem,
      );

      telemetry.end(['start:select_server_screen']);
      telemetry.save();
  }

  componentDidUpdate(prevProps, prevState) {
      if (
          this.state.connected &&
      this.props.hasConfigAndLicense &&
      !(prevState.connected && prevProps.hasConfigAndLicense)
      ) {
          if (LocalConfig.EnableMobileClientUpgrade) {
              this.props.actions.setLastUpgradeCheck();
              const {currentVersion, minVersion, latestVersion} = this.props;
              const upgradeType = checkUpgradeType(
                  currentVersion,
                  minVersion,
                  latestVersion,
              );
              if (isUpgradeAvailable(upgradeType)) {
                  this.handleShowClientUpgrade(upgradeType);
              } else {
                  this.handleLoginOptions(this.props);
              }
          } else {
              this.handleLoginOptions(this.props);
          }
      }
  }

  componentWillUnmount() {
      if (Platform.OS === 'android') {
          Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
      }

      this.certificateListener?.remove();
      this.sslProblemListener?.remove();
      this.navigationEventListener?.remove();
  }

  componentDidDisappear() {
      this.setState({
          connected: false,
      });
  }

  //fixme: too much repetition
  blur = () => {
      if (this.textInput) {
          this.textInput.blur();
      }
  };

  getUrl = async (serverUrl: string, useHttp = false) => {
      let url = this.sanitizeUrl(serverUrl, useHttp);

      try {
          const resp = await fetch(url, {method: 'HEAD'});
          if (resp?.rnfbRespInfo?.redirects?.length) {
              url =
          resp.rnfbRespInfo.redirects[resp.rnfbRespInfo.redirects.length - 1];
          }
      } catch {
      // do nothing
      }

      return this.sanitizeUrl(url, useHttp);
  };

  goToNextScreen = (
      screen: string,
      title: string,
      passProps = {},
      navOptions = {},
  ) => {
      const {allowOtherServers} = this.props;
      let visible = !LocalConfig.AutoSelectServerUrl;

      if (!allowOtherServers) {
          visible = false;
      }

      const defaultOptions = {
          popGesture: visible,
          topBar: {
              visible,
              height: visible ? null : 0,
          },
      };
      const options = merge(defaultOptions, navOptions);

      goToScreen(screen, title, passProps, options);
  };

  handleAndroidKeyboard = () => {
      this.blur();
  };

  handleLoginOptions = async () => {
      const {formatMessage} = this.context.intl;
      const {config, license} = this.props;

      const samlEnabled =
      config.EnableSaml === 'true' &&
      license.IsLicensed === 'true' &&
      license.SAML === 'true';
      const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';
      const googleEnabled =
      config.EnableSignUpWithGoogle === 'true' && license.IsLicensed === 'true';
      const o365Enabled =
      config.EnableSignUpWithOffice365 === 'true' &&
      license.IsLicensed === 'true' &&
      license.Office365OAuth === 'true';
      const openIdEnabled =
      config.EnableSignUpWithOpenId === 'true' &&
      license.IsLicensed === 'true' &&
      isMinimumServerVersion(config.Version, 5, 33, 0);

      let options = 0;
      if (
          samlEnabled ||
      gitlabEnabled ||
      googleEnabled ||
      o365Enabled ||
      openIdEnabled
      ) {
          options += 1;
      }

      let screen: string;
      let title: string;
      if (options) {
          screen = 'LoginOptions';
          title = formatMessage({
              id: 'mobile.routes.loginOptions',
              defaultMessage: 'Login Chooser',
          });
      } else {
          screen = 'Login';
          title = formatMessage({
              id: 'mobile.routes.login',
              defaultMessage: 'Login',
          });
      }

      this.props.actions.resetPing();
      await globalEventHandler.configureAnalytics();

      if (Platform.OS === 'ios') {
          if (
              config.ExperimentalClientSideCertEnable === 'true' &&
        config.ExperimentalClientSideCertCheck === 'primary'
          ) {
              // log in automatically and send directly to the channel screen
              this.loginWithCertificate();
              return;
          }

          //fixme: clear this timeout
          setTimeout(() => {
              this.goToNextScreen(screen, title);
          }, 350);
      } else {
          this.goToNextScreen(screen, title);
      }
  };

  handleShowClientUpgrade = (upgradeType: string) => {
      const {formatMessage} = this.context.intl;
      const screen = 'ClientUpgrade';
      const title = formatMessage({
          id: 'mobile.client_upgrade',
          defaultMessage: 'Client Upgrade',
      });
      const passProps = {
          closeAction: this.handleLoginOptions,
          upgradeType,
      };
      const options = {
          statusBar: {
              visible: false,
          },
      };

      this.goToNextScreen(screen, title, passProps, options);
  };

  handleTextChanged = (url: string) => {
      this.setState({url});
  };

  inputRef = (ref: TextInput) => {
      this.textInput = ref;
  };

  loginWithCertificate = async () => {
      tracker.initialLoad = Date.now();

      await this.props.actions.login('credential', 'password');
      this.scheduleSessionExpiredNotification();

      resetToChannel();
  };

  pingServer = async (url: string, retryWithHttp = true) => {
      const {
          getPing,
          handleServerUrlChanged,
          loadConfigAndLicense,
          setServerVersion,
      } = this.props.actions;

      this.setState({
          connected: false,
          connecting: true,
          error: null,
      });

      let cancel = false;
      this.cancelPing = () => {
          cancel = true;

          this.setState({
              connected: false,
              connecting: false,
          });

          this.cancelPing = null;
      };

      const serverUrl = await this.getUrl(url, !retryWithHttp);
      Client4.setUrl(serverUrl);
      handleServerUrlChanged(serverUrl);

      try {
          const result = await getPing();

          if (cancel) {
              return;
          }

          if (result.error && retryWithHttp) {
              const nurl = serverUrl.replace('https:', 'http:');
              this.pingServer(nurl, false);
              return;
          }

          if (!result.error) {
              loadConfigAndLicense();
              setServerVersion(Client4.getServerVersion());
          }

          this.setState({
              connected: !result.error,
              connecting: false,
              error: result.error,
          });
      } catch {
          if (cancel) {
              return;
          }

          this.setState({
              connecting: false,
          });
      }
  };

  sanitizeUrl = (url: string, useHttp = false) => {
      let preUrl = urlParse(url, true);

      if (!preUrl.host || preUrl.protocol === 'file:') {
          preUrl = urlParse('https://' + stripTrailingSlashes(url), true);
      }

      if (preUrl.protocol === 'http:' && !useHttp) {
          preUrl.protocol = 'https:';
      }
      return stripTrailingSlashes(
          `${preUrl.protocol}//${preUrl.host}${preUrl.pathname}`,
      );
  };

  handleConnect = preventDoubleTap(async () => {
      Keyboard.dismiss();
      const {connecting, connected, url} = this.state;
      if (connecting || connected) {
          this.cancelPing?.();
          return;
      }

      if (!url || url.trim() === '') {
          this.setState({
              error: {
                  intl: {
                      id: t('mobile.server_url.empty'),
                      defaultMessage: 'Please enter a valid server URL',
                  },
              },
          });

          return;
      }

      if (!isValidUrl(this.sanitizeUrl(url))) {
          this.setState({
              error: {
                  intl: {
                      id: t('mobile.server_url.invalid_format'),
                      defaultMessage: 'URL must start with http:// or https://',
                  },
              },
          });

          return;
      }

      await globalEventHandler.resetState();
      if (LocalConfig.ExperimentalClientSideCertEnable && Platform.OS === 'ios') {
          RNFetchBlob.cba.selectCertificate((certificate) => {
              if (certificate) {
                  mattermostBucket.setPreference('cert', certificate);
                  window.fetch = new RNFetchBlob.polyfill.Fetch({
                      auto: true,
                      certificate,
                  }).build();
                  this.pingServer(url);
              }
          });
      } else {
          this.pingServer(url);
      }
  });

  scheduleSessionExpiredNotification = () => {
      const {intl} = this.context;
      const {actions} = this.props;

      actions.scheduleExpiredNotification(intl);
  };

  handleSslProblem = () => {
      const {connecting, connected, url} = this.state;

      if (!connecting && !connected) {
          return null;
      }

      this.cancelPing?.();

      const host = urlParse(url, true).host || url;

      const {formatMessage} = this.context.intl;
      Alert.alert(
          formatMessage({
              id: 'mobile.server_ssl.error.title',
              defaultMessage: 'Untrusted Certificate',
          }),
          formatMessage(
              {
                  id: 'mobile.server_ssl.error.text',
                  defaultMessage:
            'The certificate from {host} is not trusted.\n\nPlease contact your System Administrator to resolve the certificate issues and allow connections to this server.',
              },
              {
                  host,
              },
          ),
          [{text: 'OK'}],
          {cancelable: false},
      );
      return null;
  };

  selectCertificate = () => {
      //fixme:  how does this work ?
      const url = this.getUrl();
      RNFetchBlob.cba.selectCertificate((certificate) => {
          if (certificate) {
              mattermostBucket.setPreference('cert', certificate);
              fetchConfig().then(() => {
                  this.pingServer(url, true);
              });
          }
      });
  };

  render() {
      const {formatMessage} = this.context.intl;
      const {allowOtherServers} = this.props;
      const {connected, connecting, error, url} = this.state;

      let buttonIcon;
      let buttonText;
      if (connected || connecting) {
          buttonIcon = (
              <ActivityIndicator
                  animating={true}
                  size='small'
                  style={style.connectingIndicator}
              />
          );
          buttonText = (
              <FormattedText
                  id='mobile.components.select_server_view.connecting'
                  defaultMessage='Connecting...'
              />
          );
      } else {
          buttonText = (
              <FormattedText
                  id='mobile.components.select_server_view.connect'
                  defaultMessage='Connect'
              />
          );
      }

      const barStyle =
      Platform.OS === 'android' ? 'light-content' : 'dark-content';

      const inputDisabled = !allowOtherServers || connected || connecting;

      const inputStyle: Styles[] = [GlobalStyles.inputBox];
      if (inputDisabled) {
          inputStyle.push(style.disabledInput);
      }

      return (
          <SafeAreaView
              testID='select_server.screen'
              style={style.container}
          >
              <KeyboardAvoidingView
                  behavior='padding'
                  style={style.container}
                  keyboardVerticalOffset={0}
                  enabled={Platform.OS === 'ios'}
              >
                  <StatusBar barStyle={barStyle}/>
                  <TouchableWithoutFeedback
                      onPress={this.blur}
                      accessible={false}
                  >
                      <View
                          style={[GlobalStyles.container, GlobalStyles.signupContainer]}
                      >
                          <Image
                              source={require('@assets/images/logo.png')}
                              style={{height: 72, resizeMode: 'contain'}}
                          />

                          <View testID='select_server.header.text'>
                              <FormattedText
                                  style={StyleSheet.flatten([
                                      GlobalStyles.header,
                                      GlobalStyles.label,
                                  ])}
                                  id='mobile.components.select_server_view.enterServerUrl'
                                  defaultMessage='Enter Server URL'
                              />
                          </View>
                          <TextInput
                              testID='select_server.server_url.input'
                              ref={this.inputRef}
                              value={url}
                              editable={!inputDisabled}
                              onChangeText={this.handleTextChanged}
                              onSubmitEditing={this.handleConnect}
                              style={StyleSheet.flatten(inputStyle)}
                              autoCapitalize='none'
                              autoCorrect={false}
                              keyboardType='url'
                              placeholder={formatMessage({
                                  id: 'mobile.components.select_server_view.siteUrlPlaceholder',
                                  defaultMessage: 'https://mattermost.example.com',
                              })}
                              placeholderTextColor={changeOpacity('#000', 0.5)}
                              returnKeyType='go'
                              underlineColorAndroid='transparent'
                              disableFullscreenUI={true}
                          />
                          <Button
                              testID='select_server.connect.button'
                              onPress={this.handleConnect}
                              containerStyle={[
                                  GlobalStyles.signupButton,
                                  style.connectButton,
                              ]}
                          >
                              {buttonIcon}
                              <Text style={GlobalStyles.signupButtonText}>{buttonText}</Text>
                          </Button>
                          <View>
                              <ErrorText
                                  testID='select_server.error.text'
                                  error={error}
                              />
                          </View>
                      </View>
                  </TouchableWithoutFeedback>
                  <AppVersion/>
              </KeyboardAvoidingView>
          </SafeAreaView>
      );
  }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    disabledInput: {
        backgroundColor: '#e3e3e3',
    },
    connectButton: {
        alignItems: 'center',
    },
    connectingIndicator: {
        marginRight: 5,
    },
});

//todo:  is this the correct way of calling the database ?
const withObserver = withObservables([], async () => {
    return {
        systems: getSystems(),
    };
});

export default withObserver(SelectServer);
