# mattermost-intune.podspec
require 'json'

pkg = JSON.parse(File.read(File.join(__dir__, 'package.json')))
intune_sdk_version = ENV['INTUNE_IOS_SDK_VERSION'] || '21.2.0'

Pod::Spec.new do |s|
  s.name         = "mattermost-intune"
  s.module_name  = 'mattermost_intune'
  s.version      = pkg["version"]
  s.summary      = pkg["description"]
  s.homepage     = pkg["homepage"] || "https://github.com/mattermost/mattermost-mobile"
  s.license      = pkg["license"]
  s.authors      = pkg["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => ".git", :tag => s.version.to_s }

  s.swift_version = '5.9'
  s.requires_arc  = true
  s.static_framework = true

  s.source_files = "ios/Source/**/*.{h,m,mm,swift}"

  # Intune SDK: fetch into ios/Frameworks on pod install
  s.prepare_command = <<-CMD
    set -euo pipefail
    DEST="ios/Frameworks"
    rm -rf "$DEST" && mkdir -p "$DEST"
    TMP="$(mktemp -d)"
    git clone --depth 1 --branch #{intune_sdk_version} https://github.com/microsoftconnect/ms-intune-app-sdk-ios "$TMP"
    cp -R "$TMP/IntuneMAMSwift.xcframework" "$DEST/"
    cp -R "$TMP/IntuneMAMSwiftStub.xcframework" "$DEST/"
    rm -rf "$TMP"
  CMD

  s.preserve_paths = 'ios/Frameworks/**/*.xcframework'
  s.vendored_frameworks = [
    'ios/Frameworks/IntuneMAMSwift.xcframework',
    'ios/Frameworks/IntuneMAMSwiftStub.xcframework'
  ]

  s.pod_target_xcconfig = {
    'DEFINES_MODULE'       => 'YES',
    'CLANG_ENABLE_MODULES' => 'YES',
  }

  # iOS system frameworks/libraries Intune commonly needs
  s.frameworks = %w[
    MessageUI Security CoreServices SystemConfiguration ImageIO
    LocalAuthentication AudioToolbox QuartzCore WebKit MetricKit
  ]
  s.libraries = 'sqlite3', 'c++'

  install_modules_dependencies(s)
  s.dependency 'MSAL'
  s.dependency 'Gekidou'
end
