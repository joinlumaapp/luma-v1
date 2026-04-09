const { withAndroidStyles } = require('expo/config-plugins');

function withAndroidStatusBar(config, { statusBarColor = '#0d0d14', lightIcons = true } = {}) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    if (!styles.resources.style) {
      styles.resources.style = [];
    }

    let appTheme = styles.resources.style.find(
      (s) => s.$.name === 'AppTheme'
    );

    if (!appTheme) {
      appTheme = {
        $: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
        item: [],
      };
      styles.resources.style.push(appTheme);
    }

    if (!appTheme.item) {
      appTheme.item = [];
    }

    // Remove existing status bar items
    appTheme.item = appTheme.item.filter(
      (item) =>
        item.$.name !== 'android:statusBarColor' &&
        item.$.name !== 'android:windowLightStatusBar' &&
        item.$.name !== 'android:windowDrawsSystemBarBackgrounds'
    );

    // Add our status bar config
    appTheme.item.push({
      $: { name: 'android:statusBarColor' },
      _: statusBarColor,
    });

    appTheme.item.push({
      $: { name: 'android:windowLightStatusBar' },
      _: lightIcons ? 'false' : 'true',
    });

    appTheme.item.push({
      $: { name: 'android:windowDrawsSystemBarBackgrounds' },
      _: 'true',
    });

    return config;
  });
}

module.exports = withAndroidStatusBar;
