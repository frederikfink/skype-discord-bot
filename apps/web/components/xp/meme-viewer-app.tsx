type MemeViewerAppProps = {
  src: string;
  alt: string;
};

export function MemeViewerApp({ src, alt }: MemeViewerAppProps) {
  return (
    <div className="xp-meme-viewer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xp-meme-viewer-img" src={src} alt={alt} draggable={false} />
    </div>
  );
}

export function MemeViewerStatus() {
  return (
    <div className="xp-statusbar">
      <span>Object(s) selected: 1 legendary dansker</span>
    </div>
  );
}
