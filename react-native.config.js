module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.taqlyn.TaqlynSdkPackage;',
        packageInstance: 'new TaqlynSdkPackage()',
      },
      ios: {},
    },
  },
}
