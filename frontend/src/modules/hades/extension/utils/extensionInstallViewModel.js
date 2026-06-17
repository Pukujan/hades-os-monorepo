export function buildExtensionInstallPanelState(raw) {
  if (!raw) {
    return {
      providerId: "hades-browser-extension",
      title: "Hades Browser Extension",
      status: "ready",
      primaryActions: {
        generateKey: { label: "Generate new API key" },
        copySecret: { label: "Copy API key", enabled: false },
        downloadExtension: {
          label: "Download extension",
          href: "/api/hades/extension/download",
        },
      },
      latestCreatedSecret: null,
      keys: [],
    };
  }

  return {
    providerId: "hades-browser-extension",
    title: "Hades Browser Extension",
    status: raw.bundleStatus || "ready",
    primaryActions: {
      generateKey: { label: "Generate new API key" },
      copySecret: {
        label: "Copy API key",
        enabled: Boolean(raw.latestCreatedSecret),
      },
      downloadExtension: {
        label: "Download extension",
        href: "/api/hades/extension/download",
      },
    },
    latestCreatedSecret: raw.latestCreatedSecret
      ? { value: raw.latestCreatedSecret, visibleOnce: true }
      : null,
    keys: (raw.keys || []).map((key) => ({
      id: key.id,
      name: key.name,
      scopes: key.scopes || [],
      secretPreview: key.secretPreview || null,
      secretVisible: false,
      canRotate: !key.revokedAt,
      canRevoke: !key.revokedAt,
      revokedAt: key.revokedAt || null,
    })),
  };
}
