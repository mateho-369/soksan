import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Check } from 'lucide-react';
import SokSanMap from './SokSanMap';
import { isInsideCambodia, type LatLng } from '../../lib/mapConfig';
import { useLanguage } from '../../contexts/LanguageContext';

export interface PlacePickerProps {
  /** Optional anchor, e.g. the selected commune's coordinates. */
  initialCenter?: [number, number];
  onConfirm: (point: LatLng) => void;
  onClose: () => void;
}

/**
 * Manual pin path: tap the map to drop a pin, then confirm. This is what
 * regular users use when there is no Google Places match (businesses get
 * the one-time Places confirmation instead — see backend PlacesService).
 */
export default function PlacePicker({ initialCenter, onConfirm, onClose }: PlacePickerProps) {
  const { t } = useLanguage();
  const [point, setPoint] = useState<LatLng | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handlePick = useCallback((picked: LatLng) => {
    setPoint(picked);
  }, []);

  const valid = point !== null && isInsideCambodia(point);

  return createPortal(
    <div
      className="place-picker-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="place-picker"
        role="dialog"
        aria-modal="true"
        aria-label={t('map.pickTitle')}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="place-picker-header">
          <div>
            <h2>{t('map.pickTitle')}</h2>
            <p>{t('map.pickHelp')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('map.close')}>
            <X size={18} />
          </button>
        </header>

        <SokSanMap
          className="place-picker-map"
          onPick={handlePick}
          pickedPoint={point}
          center={initialCenter}
          zoom={initialCenter ? 11 : undefined}
          fitToPins={false}
          ariaLabel={t('map.pickMapLabel')}
        />

        <footer className="place-picker-footer">
          <span className="place-picker-coords">
            <MapPin size={15} />
            {point
              ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
              : t('map.tapToDrop')}
            {point && !isInsideCambodia(point) && (
              <em className="place-picker-warn">{t('map.outsideCambodia')}</em>
            )}
          </span>
          <button
            type="button"
            className="place-picker-confirm"
            disabled={!valid}
            onClick={() => point && onConfirm(point)}
          >
            <Check size={16} /> {t('map.confirmPin')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
