LUMA Mobile App — Required Asset Files
========================================

Before building for production, the following image assets MUST be placed
in this directory. All images should be PNG format with no transparency
on the background layer (Apple requirement).

1. icon.png
   - Dimensions : 1024 x 1024 px
   - Purpose     : App icon for both iOS and Android
   - Notes       : No rounded corners — the OS applies masking automatically.
                   Must be opaque (no alpha channel).

2. splash.png
   - Dimensions : 1284 x 2778 px (iPhone 14 Pro Max safe area)
   - Purpose     : Launch/splash screen shown while the app loads
   - Notes       : Use the LUMA brand color (#0F0F23) as background.
                   Center the LUMA logo with comfortable padding.
                   Expo resizeMode is set to "contain".

3. adaptive-icon.png
   - Dimensions : 1024 x 1024 px
   - Purpose     : Android adaptive icon foreground layer
   - Notes       : The foreground image is rendered on top of the
                   background color (#0F0F23) defined in app.json.
                   Keep important content within the inner 66% safe zone
                   (approx 676 x 676 px centered) to avoid clipping
                   on different Android launcher shapes.

Asset Generation Tips
---------------------
- Use a tool like Figma, Sketch, or https://icon.kitchen to export
  all required sizes from a single source file.
- Run `npx expo-optimize` after placing assets to compress them.
- Test on multiple device sizes before submitting to stores.
