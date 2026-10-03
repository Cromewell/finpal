import { IconDownload, IconLink, IconPrint, IconReset } from './ui';

export function Werkzeugleiste({
  onTeilen, onCsv, onZuruecksetzen,
}: {
  onTeilen: () => void;
  onCsv: () => void;
  onZuruecksetzen: () => void;
}) {
  return (
    <div className="toolbar">
      <button type="button" className="btn" onClick={onTeilen}>
        <IconLink />Link zum Szenario
      </button>
      <button type="button" className="btn" onClick={onCsv}>
        <IconDownload />Als CSV
      </button>
      <button type="button" className="btn" onClick={() => window.print()}>
        <IconPrint />Drucken
      </button>
      <button type="button" className="btn btn--ghost" onClick={onZuruecksetzen}>
        <IconReset />Zurücksetzen
      </button>
    </div>
  );
}
