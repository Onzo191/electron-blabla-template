import { useState } from "react";
import electronLogo from "./assets/electron.svg";
import Versions from "./components/Versions";

function App(): React.JSX.Element {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const ipcHandle = async (): Promise<void> => {
    const result = await window.api.invoke("app:getVersion", undefined);
    if (result.ok) {
      setAppVersion(`${result.data.version} (${result.data.platform})`);
    } else {
      setAppVersion(`error ${result.error.code}: ${result.error.message}`);
    }
  };

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <button type="button" onClick={() => void ipcHandle()}>
            Get app version via IPC
          </button>
        </div>
      </div>
      {appVersion !== null && (
        <p className="tip">app:getVersion → {appVersion}</p>
      )}
      <Versions></Versions>
    </>
  );
}

export default App;
