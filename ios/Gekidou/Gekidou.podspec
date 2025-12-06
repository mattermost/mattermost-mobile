Pod::Spec.new do |s|
  s.name                  = 'Gekidou'
  s.author                = 'Mattermost, Inc.'
  s.version               = '0.1.0'
  s.license               = 'MIT'
  s.homepage              = 'https://github.com/mattermost/mattermost-mobile'
  s.summary               = 'Gekidou core library'
  s.platform              = :ios, '15.1'               # match repo baseline
  s.swift_versions        = ['5.9', '5.10']            # safe spread
  s.source                = { :git => ".git", :tag => "#{s.version}" }
  s.source_files          = 'Sources/**/*.{swift,h,m,mm}'
  s.requires_arc          = true

  s.static_framework      = true

  # mirror Package.swift deps
  s.dependency 'SQLite.swift', '0.15.4'             # module name: SQLite
  s.dependency 'SwiftJWT', '3.6.200'                  # module name: SwiftJWT

  s.pod_target_xcconfig = {
    'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',
  }
end
