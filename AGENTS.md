# AIRunningTracker agent instructions

## Native iPhone and iPad interfaces

Apply this workflow to iOS and iPadOS interface tasks, across repositories. It does not require app edits for planning or read-only audits. Respect the app's deployment target, existing functionality, data contracts, privacy boundaries, and repository-specific instructions.

- Start with the current [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) and the app's design system. Use `apple-ux-designer` for a new or revised flow, `adaptive-ipad-design` for layouts and multitasking, `ios-ux-auditor` for review, and `ios-conversion-optimizer` for a specific conversion problem.
- Prefer a polished native SwiftUI experience: native navigation and controls, SF Symbols with meaningful labels, restrained motion that respects Reduce Motion, and reusable components with semantic color, typography, and spacing tokens. Support light and dark appearances, Dynamic Type through accessibility sizes, VoiceOver reading order and actions, and a non-color cue for meaningful states.
- Design for the available window, not the device name. Keep iPhone navigation simple. On iPad consider sidebar/detail layouts, narrow split-screen windows, rotation, and keyboard navigation. Preserve selection and navigation state as the window changes.
- Use the official Figma plugin's `figma-swiftui` skill. Inspect the selected frame, screenshot, tokens and components before implementing. Use real view states for editable handoff and explicitly map Figma variants to SwiftUI states. Never treat a bitmap as an editable design or change an unauthorized shared design.
- Use the official Build iOS Apps plugin and XcodeBuildMCP on a Mac with Xcode for runtime verification. Baseline existing behavior, then run relevant tests and XCUITests. Compare iPhone and iPad simulator screenshots in light and dark, including narrow windows and accessibility text sizes where relevant. Verify VoiceOver and Reduce Motion separately. Report devices, tests, artifacts and remaining gaps; a mockup is not runtime evidence.
- On Windows, use the application's authorized GitHub macOS CI. The standalone [Apple simulator MCP diagnostic](https://github.com/biserd/NYCSchools-iOS/actions/workflows/apple-mcp-diagnostics.yml) verifies the toolchain only. Never use signing, release or TestFlight workflows as a substitute for simulator checks.

## Product design standards

Apply [PRODUCT-DESIGN-PRINCIPLES.md](PRODUCT-DESIGN-PRINCIPLES.md) to application features, screens, UX changes and design reviews. Use the global `product-ux-optimizer` skill for workflow simplicity, activation and monetization UX. Follow platform verification and maintain existing app contracts. A [portable copy](docs/skills/product-ux-optimizer/SKILL.md) is available if the global skill is not installed.
