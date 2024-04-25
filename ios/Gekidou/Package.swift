// swift-tools-version:5.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Gekidou",
    platforms: [.iOS(.v12)],
    products: [
        // Products define the executables and libraries a package produces, and make them visible to other packages.
        .library(
            name: "Gekidou",
            targets: ["Gekidou"]),
    ],
    dependencies: [
        // Dependencies declare other packages that this package depends on.
        .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.14.1"),
        .package(url: "https://github.com/Kitura/Swift-JWT.git", from:"3.6.1")
    ],
    targets: [
        // Targets are the basic building blocks of a package. A target can define a module or a test suite.
        // Targets can depend on other targets in this package, and on products in packages this package depends on.
        .target(
            name: "Gekidou",
            dependencies: [
                .product(name: "SQLite", package: "SQLite.swift"),
                .product(name: "SwiftJWT", package: "Swift-JWT"),
            ]
        ),
        .testTarget(
            name: "GekidouTests",
            dependencies: ["Gekidou"]),
    ]
)
