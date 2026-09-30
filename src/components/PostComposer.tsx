import { apiFetch } from '../lib/http';
import { ACCESS_TAGS, MAX_SAFETY_TAGS, SAFETY_TAGS, type SafetyTag } from '../lib/safetyTags';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import '../styles/safety.css';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ImagePlus, Play, X, MapPin, Camera, Smile, Send, UserRound, MapPinned } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PlacePicker from './map/PlacePicker';
import type { LatLng } from '../lib/mapConfig';
import type { Category, Province, Geography } from '../types';

interface PendingMedia {
  file: File;
  preview: string;
  media_type: 'image' | 'video';
  duration_seconds: number;
}

interface PostComposerProps {
  categories: Category[];
  provinces: Province[];
  onPosted: () => void;
}

export default function PostComposer({ categories, provinces, onPosted }: PostComposerProps) {
  const { language, t } = useLanguage();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  // Phase 9 — optional self-reported safety & accessibility observations.
  const [safetyTags, setSafetyTags] = useState<SafetyTag[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [province, setProvince] = useState('');
  const [category, setCategory] = useState('hidden-gems');
  const [mediaFiles, setMediaFiles] = useState<PendingMedia[]>([]);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Phase 1 geography: users pick province -> district -> commune; only the
  // commune is stored, district/province are derived from it server-side.
  const [geography, setGeography] = useState<Geography | null>(null);
  const [districtId, setDistrictId] = useState('');
  const [communeId, setCommuneId] = useState('');

  // Phase 2 map: optional manual pin (regular users without a Places match).
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerCenter = useMemo<[number, number] | undefined>(() => {
    const commune = (geography?.communes || []).find((item) => item.id === Number(communeId));
    if (commune?.latitude != null && commune?.longitude != null) return [commune.longitude, commune.latitude];
    return undefined;
  }, [geography, communeId]);

  useEffect(() => {
    if (!open || geography) return;
    apiFetch('/geography')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Geography | null) => data && setGeography(data))
      .catch(() => {});
  }, [open, geography]);

  const districtOptions = (geography?.districts || []).filter((district) => {
    const parent = geography?.provinces.find((item) => item.id === district.province_id);
    return !province || !parent || parent.name === province;
  });
  const communeOptions = (geography?.communes || []).filter(
    (commune) => !districtId || commune.district_id === Number(districtId),
  );

  useEffect(
    () => () => mediaFiles.forEach((item) => URL.revokeObjectURL(item.preview)),
    [mediaFiles],
  );

  const toggleSafetyTag = (tag: SafetyTag) =>
    setSafetyTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : current.length < MAX_SAFETY_TAGS
          ? [...current, tag]
          : current,
    );

  const canPublish = Boolean(caption.trim() && placeName.trim() && province && category && mediaFiles.length > 0 && !publishing);

  const momentsLabel = useMemo(
    () => (mediaFiles.length === 1 ? '1 moment' : `${mediaFiles.length} moments`),
    [mediaFiles.length],
  );

  const readVideoDuration = (file: File) =>
    new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read video'));
      };
      video.src = objectUrl;
    });

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const videos = files.filter((file) => file.type.startsWith('video/'));
    const images = files.filter((file) => file.type.startsWith('image/'));
    const hasVideoAlready = mediaFiles.some((item) => item.media_type === 'video');

    if (
      videos.length > 1 ||
      (videos.length === 1 && images.length > 0) ||
      (videos.length === 1 && mediaFiles.length > 0) ||
      (hasVideoAlready && files.length > 0)
    ) {
      setError('Choose either up to 10 photos or one video up to 30 seconds.');
      return;
    }
    if (images.length > 0 && mediaFiles.length + images.length > 10) {
      setError('You can share up to 10 photos in one free post.');
      return;
    }

    const additions: PendingMedia[] = [];
    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        setError(`${file.name} is over 4 MB. Please choose a smaller file.`);
        return;
      }
      if (file.type.startsWith('video/')) {
        const duration = await readVideoDuration(file);
        if (duration > 30.2) {
          setError(`${file.name} is ${Math.ceil(duration)}s. SokSan clips can be up to 30 seconds.`);
          return;
        }
        additions.push({
          file,
          preview: URL.createObjectURL(file),
          media_type: 'video',
          duration_seconds: Math.round(duration),
        });
      } else if (file.type.startsWith('image/')) {
        additions.push({
          file,
          preview: URL.createObjectURL(file),
          media_type: 'image',
          duration_seconds: 0,
        });
      }
    }
    setError('');
    setMediaFiles((current) => [...current, ...additions]);
    setOpen(true);
  };

  const removeMedia = (index: number) =>
    setMediaFiles((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, i) => i !== index);
    });

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setError('');
    setProgress(4);
    try {
      const uploaded: { media_url: string; media_type: string; duration_seconds: number }[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const item = mediaFiles[i];
        const base64 = await toBase64(item.file);
        const res = await apiFetch('/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: item.file.name,
            fileBase64: base64,
            contentType: item.file.type,
            duration: item.duration_seconds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push({
          media_url: data.url,
          media_type: item.media_type,
          duration_seconds: item.duration_seconds,
        });
        setProgress(Math.round(((i + 1) / mediaFiles.length) * 80));
      }
      const res = await apiFetch('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          location_name: placeName,
          province,
          caption,
          commune_id: communeId ? Number(communeId) : null,
          // Optional manual pin — matches the backend StorePostRequest.
          latitude: pin ? pin.lat : null,
          longitude: pin ? pin.lng : null,
          // Phase 9 — optional safety & accessibility observations.
          safety_tags: safetyTags,
          media: uploaded,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Could not publish post');
      setProgress(100);
      setPin(null);
      setSafetyTags([]);
      mediaFiles.forEach((item) => URL.revokeObjectURL(item.preview));
      setMediaFiles([]);
      setCaption('');
      setPlaceName('');
      setProvince('');
      setOpen(false);
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish post');
    } finally {
      setPublishing(false);
      setProgress(0);
    }
  };

  // Guests can browse everything for free; posting needs a free account.
  // While the stored session is still loading, render nothing to avoid a
  // login CTA flashing for returning users.
  if (initializing) {
    return <section className="post-composer" aria-busy="true" />;
  }

  if (!user) {
    return (
      <section className="post-composer composer-guest">
        <div className="composer-guest-text">
          <h3>{t('auth.composerLoginTitle')}</h3>
          <p>{t('auth.composerLoginBody')}</p>
        </div>
        <button className="composer-guest-cta" onClick={() => navigate('/login')}>
          <UserRound size={16} /> {t('auth.composerLoginCta')}
        </button>
      </section>
    );
  }

  return (
    <motion.section className={`post-composer ${open ? 'open' : ''}`} layout>
      <div className="composer-start">
        <img src={user.avatar_url} alt="" />
        <button onClick={() => setOpen(true)}>{t('social.composerPrompt')}</button>
        <span className="composer-free-chip">{t('access.freeChip')}</span>
        <label>
          <ImagePlus />
          <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} />
        </label>
      </div>
      {open && (
        <div className="composer-expanded">
          <div className="composer-free-note">{t('access.postingFree')}</div>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t('social.storyPrompt')}
            maxLength={2200}
          />
          {mediaFiles.length > 0 && (
            <div className={`composer-media-grid count-${Math.min(mediaFiles.length, 4)}`}>
              {mediaFiles.map((item, index) => (
                <div key={item.preview}>
                  {item.media_type === 'video' ? <video src={item.preview} muted /> : <img src={item.preview} alt="" />}
                  {item.media_type === 'video' && (
                    <span>
                      <Play /> {item.duration_seconds}s
                    </span>
                  )}
                  <button onClick={() => removeMedia(index)}>
                    <X />
                  </button>
                  {index === 3 && mediaFiles.length > 4 && <strong>+{mediaFiles.length - 4}</strong>}
                </div>
              ))}
            </div>
          )}
          <div className="composer-details">
            <label>
              <MapPin />
              <input
                value={placeName}
                onChange={(event) => setPlaceName(event.target.value)}
                placeholder={t('social.placeName')}
              />
            </label>
            <select
              value={province}
              onChange={(event) => {
                setProvince(event.target.value);
                // Changing the province invalidates the narrower picks.
                setDistrictId('');
                setCommuneId('');
              }}
              aria-label={t('social.chooseProvince')}
            >
              <option value="">{t('social.chooseProvince')}</option>
              {provinces.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.icon} {language === 'kh' ? item.name_kh : item.name}
                </option>
              ))}
            </select>
            <select
              value={districtId}
              onChange={(event) => {
                setDistrictId(event.target.value);
                setCommuneId('');
              }}
              aria-label={t('social.chooseDistrict')}
            >
              <option value="">{t('social.chooseDistrict')}</option>
              {districtOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {language === 'kh' ? item.name_kh : item.name}
                </option>
              ))}
            </select>
            <select
              value={communeId}
              onChange={(event) => setCommuneId(event.target.value)}
              aria-label={t('social.chooseCommune')}
            >
              <option value="">{t('social.chooseCommune')}</option>
              {communeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {language === 'kh' ? item.name_kh : item.name}
                </option>
              ))}
            </select>
            <div className="composer-pin-row">
              <button
                type="button"
                className="composer-pin-button"
                onClick={() => setPickerOpen(true)}
                aria-label={t('map.composerPin')}
              >
                <MapPinned size={15} /> {t('map.composerPin')}
              </button>
              {pin && (
                <span className="composer-pin-chip">
                  {t('map.pinnedAt')} {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  <button
                    type="button"
                    onClick={() => setPin(null)}
                    aria-label={t('map.clearPin')}
                  >
                    <X size={13} />
                  </button>
                </span>
              )}
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Category"
            >
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.emoji} {language === 'kh' ? item.label_kh : item.label_en}
                </option>
              ))}
            </select>
          </div>

          {/* Phase 9 — optional safety & accessibility observations. */}
          <div className="safety-block">
            <span className="safety-block-label">{t('safety.blockLabel')}</span>
            <div className="safety-chips" role="group" aria-label={t('safety.blockLabel')}>
              {[...SAFETY_TAGS, ...ACCESS_TAGS].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`safety-chip${safetyTags.includes(tag) ? ' on' : ''}`}
                  aria-pressed={safetyTags.includes(tag)}
                  onClick={() => toggleSafetyTag(tag)}
                >
                  {t(`safety.tag.${tag}`)}
                </button>
              ))}
            </div>
            <p className="safety-note">{t('safety.note')}</p>
          </div>

          {error && <div className="composer-error">{error}</div>}
          <div className="composer-footer">
            <div>
              <label>
                <Camera />
                <span>{t('social.addMedia')}</span>
                <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} />
              </label>
              <button>
                <Smile />
              </button>
              {mediaFiles.length > 0 && (
                <span>
                  {momentsLabel} · {mediaFiles[0]?.media_type === 'video' ? 'video ≤ 30s' : 'up to 10 photos'}
                </span>
              )}
            </div>
            <div>
              <button className="composer-cancel" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="composer-publish" disabled={!canPublish} onClick={publish}>
                {publishing ? (
                  <>
                    <span className="button-spinner" /> {progress}%
                  </>
                ) : (
                  <>
                    <Send /> {t('social.publish')}
                  </>
                )}
              </button>
            </div>
          </div>
          {publishing && (
            <div className="upload-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}
      {pickerOpen && (
        <PlacePicker
          initialCenter={pickerCenter}
          onClose={() => setPickerOpen(false)}
          onConfirm={(point) => {
            setPin(point);
            setPickerOpen(false);
          }}
        />
      )}
    </motion.section>
  );
}
