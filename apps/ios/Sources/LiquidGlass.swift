import SwiftUI

/// A quiet brand backdrop gives Liquid Glass something meaningful to sample
/// without competing with running data or coaching copy.
struct RunAmbientBackdrop: View {
    var body: some View {
        ZStack {
            RunBrand.canvas
            LinearGradient(
                colors: [RunBrand.orange.opacity(0.16), RunBrand.teal.opacity(0.07), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}

extension View {
    /// Uses native Liquid Glass on iOS 26 and keeps the existing accessible,
    /// high-contrast surface on earlier supported systems.
    @ViewBuilder
    func runGlassSurface(cornerRadius: CGFloat = 24) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
        } else {
            self
                .background(RunBrand.surface, in: RoundedRectangle(cornerRadius: cornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .strokeBorder(RunBrand.orange.opacity(0.12), lineWidth: 1)
                )
        }
    }

    /// Keeps the Run Analytics orange while adopting the responsive glass
    /// interaction on iOS 26.
    @ViewBuilder
    func runPrimaryActionStyle(tint: Color = RunBrand.orange) -> some View {
        if #available(iOS 26.0, *) {
            self.buttonStyle(.glassProminent).tint(tint)
        } else {
            self.buttonStyle(.borderedProminent).tint(tint)
        }
    }

    @ViewBuilder
    func runSecondaryActionStyle() -> some View {
        if #available(iOS 26.0, *) {
            self.buttonStyle(.glass)
        } else {
            self.buttonStyle(.bordered)
        }
    }
}
