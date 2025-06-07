require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "secure-pdf-viewer"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => ".git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  fabric_enabled = ENV["RCT_NEW_ARCH_ENABLED"] == "1"
  other_cpp_flags = fabric_enabled ? "-DRCT_NEW_ARCH_ENABLED=1" : ""

  install_modules_dependencies(s)

  s.pod_target_xcconfig    = {
    'USE_HEADERMAP' => 'YES',
    "DEFINES_MODULE" => "YES",
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    "BUILD_LIBRARY_FOR_DISTRIBUTION" => "YES",
    "OTHER_CPLUSPLUSFLAGS" => other_cpp_flags,
    "OTHER_SWIFT_FLAGS" => "-no-verify-emitted-module-interface",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
  }

  user_header_search_paths = [
    '"${PODS_CONFIGURATION_BUILD_DIR}/secure-pdf-viewer/Swift Compatibility Header"',
  ]
  s.user_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => user_header_search_paths,
  }

  s.frameworks = ["PDFKit", "UIKit", "Foundation"]
end
