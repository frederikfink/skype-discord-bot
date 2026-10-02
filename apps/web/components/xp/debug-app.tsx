export function DebugApp({ payload }: { payload: unknown }) {
  return <pre className="xp-debug xp-debug-window">{JSON.stringify(payload, null, 2)}</pre>;
}

export function DebugStatus() {
  return (
    <div className="xp-statusbar">
      <span className="xp-statusbar-panel">JSON</span>
    </div>
  );
}
