// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TaqlynRNBridge",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(name: "TaqlynRNBridge", targets: ["TaqlynRNBridge"]),
    ],
    dependencies: [
        .package(name: "TaqlynSDK", path: "../../sdk-ios"),
    ],
    targets: [
        .target(
            name: "TaqlynRNBridge",
            dependencies: [
                .product(name: "TaqlynSDK", package: "TaqlynSDK"),
            ]
        ),
        .testTarget(
            name: "TaqlynRNBridgeTests",
            dependencies: ["TaqlynRNBridge"]
        ),
    ]
)
