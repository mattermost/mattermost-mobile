import Foundation

extension Bundle {
    static var app: Bundle {
        var components = main.bundleURL.path.split(separator: "/")
        var bundle: Bundle?
        
        if let index = components.lastIndex(where: { $0.hasSuffix(".app") }) {
            components.removeLast((components.count - 1) - index)
            bundle = Bundle(path: components.joined(separator: "/"))
        }
        
        return bundle ?? main
    }
}
