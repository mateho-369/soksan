import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/http';
import { useLanguage } from '../../contexts/LanguageContext';
import PlacePicker from '../map/PlacePicker';
import type { LatLng } from '../../lib/mapConfig';
import type { Category } from '../../types';

interface BusinessRegisterFormProps {
  onRegistered?: () => void;
}

/**
 * Phase 3 — free Verified-tier registration. Owners name the business,
 * choose a category, and fix the location with the map pin path (Phase 2).
 * New businesses show as approved in the demo; production holds them in
 * `pending` until an admin approves them (Phase 5).
 */
export default function BusinessRegisterForm({ onRegistered }: BusinessRegisterFormProps) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Category[]) => {
        setCategories(data);
        if (data[0] && !category) setCategory(data[0].slug);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = Boolean(name.trim().length >= 2 && category && !submitting);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          phone: phone.trim(),
          description: description.trim(),
          place_name: `${name.trim()}`,
          lat: pin ? pin.lat : null,
          lng: pin ? pin.lng : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not register the business');
      onRegistered?.();
      navigate('/business/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register the business');
      setSubmitting(false);
    }
  }, [canSubmit, name, category, phone, description, pin, navigate, onRegistered]);

  return (
    <form
      className="business-register-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label>
        {t('business.nameLabel')}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('business.namePlaceholder')}
          required
          minLength={2}
        />
      </label>

      <label>
        {t('business.categoryLabel')}
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.emoji} {language === 'kh' ? item.label_kh : item.label_en}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('business.phoneLabel')}
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+855 …"
          inputMode="tel"
        />
      </label>

      <label>
        {t('business.descriptionLabel')}
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('business.descriptionPlaceholder')}
          rows={3}
        />
      </label>

      <div className="business-pin-row">
        <button type="button" className="business-pin-button" onClick={() => setPickerOpen(true)}>
          <MapPin size={15} /> {t('map.composerPin')}
        </button>
        {pin && (
          <span className="business-pin-chip">
            {t('map.pinnedAt')} {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
          </span>
        )}
      </div>

      {error && (
        <p className="business-form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="business-submit" disabled={!canSubmit}>
        {submitting ? <Loader2 className="spin" size={16} /> : <Store size={16} />}{' '}
        {t('business.registerAction')}
      </button>
      <p className="business-free-note">{t('business.freeVerifiedNote')}</p>

      {pickerOpen && (
        <PlacePicker
          onClose={() => setPickerOpen(false)}
          onConfirm={(point) => {
            setPin(point);
            setPickerOpen(false);
          }}
        />
      )}
    </form>
  );
}
