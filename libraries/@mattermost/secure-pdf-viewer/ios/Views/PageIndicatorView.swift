import UIKit

class PageIndicatorView: UIView {
    private let toggleIcon: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 13, weight: .medium)
        let image = UIImage(systemName: "sidebar.left", withConfiguration: config)
        button.setImage(image, for: .normal)
        button.tintColor = .darkGray
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.isUserInteractionEnabled = false
        return button
    }()
    
    private let label: UILabel = {
        let lbl = UILabel()
        lbl.textColor = .darkGray
        lbl.font = UIFont.systemFont(ofSize: 13, weight: .medium)
        lbl.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return lbl
    }()
    
    private let stackView: UIStackView = {
        let sv = UIStackView()
        sv.axis = .horizontal
        sv.spacing = 8
        sv.alignment = .center
        sv.translatesAutoresizingMaskIntoConstraints = false
        return sv
    }()
    
    private var widthConstraint: NSLayoutConstraint?
    
    init() {
        super.init(frame: .zero)
        setupView()
        updateWidth()
    }
    
    init(target: Any?, action: Selector) {
        super.init(frame: .zero)
        let tapGesture = UITapGestureRecognizer(target: target, action: action)
        addGestureRecognizer(tapGesture)
        setupView()
        updateWidth()
    }

    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupView() {
        backgroundColor = UIColor(white: 0.75, alpha: 0.7)
        layer.cornerRadius = 6
        layer.masksToBounds = true
        setAlpha(0)
        
        addSubview(stackView)
        stackView.addArrangedSubview(toggleIcon)
        stackView.addArrangedSubview(label)

        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            stackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),
            stackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            stackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10)
        ])
    }

    public func updatePage(current: Int, total: Int) {
        label.text = "\(current) of \(total)"
        updateWidth()
    }
    
    public func setAlpha(_ alpha: CGFloat) {
        self.alpha = alpha
    }

    private func updateWidth() {
        setNeedsLayout()
        layoutIfNeeded()
        let newSize = systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)

        self.bounds.size.width = newSize.width
    }

    override var intrinsicContentSize: CGSize {
        return stackView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
    }
}
