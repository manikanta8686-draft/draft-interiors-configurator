import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfigurator } from "../configurator/context.js";
import { resolveSofaModel } from "../configurator/configuration.js";
import {
  createPersistedShareUrl,
  createSharePath,
  createShareUrl,
} from "../configurator/share.js";

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Continue to the document fallback when clipboard permission is unavailable.
    }
  }

  try {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  } catch {
    return false;
  }
}

export default function SavedConfigurations() {
  const {
    configuration,
    deleteSavedConfiguration,
    loadConfiguration,
    persistenceNotice,
    persistenceStatus,
    persistShareConfiguration,
    resetConfiguration,
    saveConfiguration,
    savedConfigurations,
  } = useConfigurator();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");

  function save(event) {
    event.preventDefault();
    if (!saveConfiguration(name)) {
      setNotice("Please enter a name and try again.");
      return;
    }
    setName("");
    setNotice("Configuration saved.");
  }

  async function share() {
    const serverId = await persistShareConfiguration();
    const url = serverId
      ? createPersistedShareUrl(serverId, configuration.modelId, window.location)
      : createShareUrl(configuration, window.location);
    setShareLink(url);
    const copied = await copyText(url);
    const fallback = serverId ? "" : " The backend is unavailable, so this link uses the compatible browser format.";
    setNotice((copied ? "Share link copied." : "Automatic copy is unavailable. Select the link below to copy it.") + fallback);
  }

  function load(record) {
    if (record.modelId === configuration.modelId) loadConfiguration(record);
    navigate(createSharePath(record));
    setNotice(`Loading ${record.name}.`);
  }

  function remove(record) {
    if (deleteSavedConfiguration(record.id)) setNotice(`${record.name} deleted.`);
    else setNotice("Could not delete that configuration.");
  }

  function reset() {
    resetConfiguration();
    setNotice("Design reset to model defaults.");
  }

  return <section className="saved-configurations" aria-labelledby="saved-configurations-title">
    <div className="saved-configurations-heading"><div><p className="eyebrow">SAVE / SHARE</p><h2 id="saved-configurations-title">Keep this design.</h2></div><p>Name configurations for later, or copy a link to share this exact sofa.</p></div>
    <form className="save-configuration-form" onSubmit={save}>
      <label htmlFor="configuration-name">Configuration name</label>
      <div><input id="configuration-name" value={name} onChange={(event) => setName(event.target.value)} maxLength="80" placeholder="e.g. Living room sofa" required /><button type="submit" className="button button-dark">Save configuration</button></div>
    </form>
    <div className="configuration-actions"><button type="button" onClick={share}>Copy share link</button><button type="button" onClick={reset}>Reset design</button></div>
    {shareLink && <label className="share-link-output">Share link<input value={shareLink} onFocus={(event) => event.target.select()} readOnly /></label>}
    {persistenceStatus === "syncing" && <p className="configuration-notice" role="status">Saved locally. Syncing with the configuration service...</p>}
    {persistenceStatus === "synced" && <p className="configuration-notice" role="status">Configuration backed up.</p>}
    {persistenceStatus === "offline" && <p className="configuration-notice" role="status">Saved locally. The configuration service is currently unavailable.</p>}
    {persistenceNotice && <p className="configuration-notice" role="status">{persistenceNotice}</p>}
    {notice && <p className="configuration-notice" role="status">{notice}</p>}
    <div className="saved-configuration-list">
      {savedConfigurations.length === 0 ? <p className="empty-saves">No saved configurations yet.</p> : savedConfigurations.map((record) => <article key={record.id}>
        <div><h3>{record.name}</h3><p>{resolveSofaModel(record.modelId).name} · {new Date(record.updatedAt).toLocaleDateString("en-IN")}</p></div>
        <div><button type="button" onClick={() => load(record)}>Load</button><button type="button" onClick={() => remove(record)}>Delete</button></div>
      </article>)}
    </div>
  </section>;
}
