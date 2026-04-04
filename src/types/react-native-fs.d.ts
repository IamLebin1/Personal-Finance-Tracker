declare module 'react-native-fs' {
  const RNFS: {
    DocumentDirectoryPath: string;
    DownloadDirectoryPath: string;
    writeFile: (path: string, contents: string, encoding?: string) => Promise<void>;
  };

  export default RNFS;
}
