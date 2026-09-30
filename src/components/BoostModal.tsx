import { apiFetch } from '../lib/http';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap,
  X,
  Sparkles,
  Eye,
  MapPinned,
  ChevronRight,
  Check,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from './States';
import type { Post, Province } from '../types';

interface BoostModalProps {
  post: Post | null;
  onClose: () => void;
  onComplete?: () => void;
}

export default function BoostModal({ post, onClose, onComplete }: BoostModalProps) {
  const { language } = useLanguage();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [budget, setBudget] = useState(10);
  const [province, setProvince] = useState('All Cambodia');
  const [targetType, setTargetType] = useState('tourists_to_region');
  const [step, setStep] = useState<'target' | 'pay' | 'done'>('target');
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const expectedViews = budget * 1000;
  const serviceFee = useMemo(() => budget * 0.05, [budget]);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    apiFetch('/boosts')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setProvinces(data.provinces || []))
      .catch(() => setError('Could not load targeting regions'))
      .finally(() => setLoading(false));
  }, [post]);

  const pay = async () => {
    if (!post?.id) return;
    setPaying(true);
    setError('');
    try {
      const res = await apiFetch('/boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          merchant_name: 'SokSan Local Merchant',
          province,
          target_type: targetType,
          budget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Boost failed');
      setPaymentRef(data.payment_ref);
      setStep('done');
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Boost failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          className="modal-backdrop boost-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="boost-modal"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">
                  <Zap /> Provincial growth
                </span>
                <h2>{step === 'done' ? 'Your gem is being discovered' : 'Boost this local story'}</h2>
              </div>
              <button onClick={onClose}>
                <X />
              </button>
            </header>

            {step === 'target' && (
              <div className="boost-targeting">
                <div className="boost-post-preview">
                  <img src={post.media_url} alt="" />
                  <div>
                    <small>{post.province}</small>
                    <strong>{post.location_name}</strong>
                    <span>
                      <Sparkles /> Ready to promote
                    </span>
                  </div>
                </div>
                {loading ? (
                  <LoadingState compact />
                ) : (
                  <>
                    <label className="budget-control">
                      <span>
                        <strong>Campaign budget</strong>
                        <b>${budget}</b>
                      </span>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={budget}
                        onChange={(event) => setBudget(Number(event.target.value))}
                      />
                      <div>
                        <span>$5</span>
                        <strong>
                          <Eye /> About {expectedViews.toLocaleString()} views
                        </strong>
                        <span>$100</span>
                      </div>
                    </label>
                    <div className="boost-selects">
                      <label>
                        <span>
                          <MapPinned /> Provincial target
                        </span>
                        <select value={province} onChange={(event) => setProvince(event.target.value)}>
                          <option>All Cambodia</option>
                          {provinces.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.icon} {language === 'kh' ? item.name_kh : item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          <Eye /> Audience intent
                        </span>
                        <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
                          <option value="tourists_to_region">Tourists traveling to this region</option>
                          <option value="province_residents">People living in the province</option>
                          <option value="eco_travelers">Eco-travel enthusiasts</option>
                        </select>
                      </label>
                    </div>
                    <div className="boost-estimate">
                      <div>
                        <small>Expected reach</small>
                        <strong>{expectedViews.toLocaleString()}</strong>
                        <span>quality views</span>
                      </div>
                      <div>
                        <small>Est. engagement</small>
                        <strong>{Math.round(expectedViews * 0.047).toLocaleString()}</strong>
                        <span>actions</span>
                      </div>
                    </div>
                    <button className="boost-next" onClick={() => setStep('pay')}>
                      Continue to secure payment <ChevronRight />
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 'pay' && (
              <div className="boost-payment">
                <div className="boost-summary">
                  <h3>Campaign summary</h3>
                  <div>
                    <span>Post promotion</span>
                    <strong>${budget.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>SokSan service fee</span>
                    <strong>${serviceFee.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Target</span>
                    <strong>{province}</strong>
                  </div>
                  <div className="boost-total">
                    <span>Total · USD</span>
                    <strong>${(budget + serviceFee).toFixed(2)}</strong>
                  </div>
                  <ul>
                    <li>
                      <Check /> Transparent reach estimate
                    </li>
                    <li>
                      <Check /> Pause campaign any time
                    </li>
                    <li>
                      <Check /> Provincial analytics included
                    </li>
                  </ul>
                </div>
                <div className="boost-khqr">
                  <div className="mini-khqr">
                    <div>
                      <strong>KHQR</strong>
                      <span>BAKONG</span>
                    </div>
                    <QrCode />
                    <b>USD {(budget + serviceFee).toFixed(2)}</b>
                    <small>Scan with any Bakong member app</small>
                  </div>
                  <p>
                    <ShieldCheck /> Encrypted local payment
                  </p>
                  {error && <div className="boost-error">{error}</div>}
                  <button disabled={paying} onClick={pay}>
                    {paying ? <span className="button-spinner" /> : <QrCode />} Scan to Pay & Boost Now
                  </button>
                  <button className="boost-back" onClick={() => setStep('target')}>
                    Back to targeting
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="boost-success">
                <div>
                  <Check />
                </div>
                <span>⚡ Featured Gem</span>
                <h3>{expectedViews.toLocaleString()} travelers can now discover your story</h3>
                <p>
                  Campaign {paymentRef} is active for {province}. Live provincial insights are available in Merchant
                  Center.
                </p>
                <button onClick={onClose}>View promoted post</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
