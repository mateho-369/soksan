import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Play, X, MapPin, Camera, Smile, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Category, Province } from '../types';

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
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [province, setProvince] = useState('');
  const [category, setCategory] = useState('hidden-gems');
  const [mediaFiles, setMediaFiles] = useState<PendingMedia[]>([]);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(
    () => () => mediaFiles.forEach((item) => URL.revokeObjectURL(item.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaFiles],
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
        const res = await fetch('/api/upload', {
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
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: 3,
          category,
          location_name: placeName,
          province,
          caption,
          media: uploaded,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not publish post');
      setProgress(100);
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

  return (
    <motion.section className={`post-composer ${open ? 'open' : ''}`} layout>
      <div className="composer-start">
        <img src="/images/traveler-dara.jpg" alt="" />
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
            <select value={province} onChange={(event) => setProvince(event.target.value)}>
              <option value="">{t('social.chooseProvince')}</option>
              {provinces.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.icon} {language === 'kh' ? item.name_kh : item.name}
                </option>
              ))}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.emoji} {language === 'kh' ? item.label_kh : item.label_en}
                </option>
              ))}
            </select>
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
    </motion.section>
  );
}
