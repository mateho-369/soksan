import { apiFetch } from '../lib/http';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageCircle,
  Plus,
  Search,
  ArrowLeft,
  Ellipsis,
  CheckCheck,
  X,
  Smile,
  Paperclip,
  MapPinned,
  Route,
  Camera,
  Send,
  MapPin,
  Map,
  ChevronRight,
  Clock3,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState, ErrorState } from '../components/States';
import type { Conversation, Message, Destination, Itinerary } from '../types';

export default function Messages() {
  const { language, t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'guides'>('all');
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'location' | 'itinerary'>('location');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch(`/conversations?filter=${filter}`);
      if (!res.ok) throw new Error('Could not load conversations');
      const data: Conversation[] = await res.json();
      setConversations(data);
      setActiveId((current) => (current && data.some((c) => c.id === current) ? current : data[0]?.id || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load');
    } finally {
      setLoadingConversations(false);
    }
  }, [filter]);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!activeId) return;
      if (!silent) setLoadingMessages(true);
      try {
        const res = await apiFetch(`/messages?conversation_id=${activeId}`);
        if (!res.ok) throw new Error('Could not load messages');
        setMessages(await res.json());
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Unable to load messages');
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [activeId],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    const interval = window.setInterval(() => loadMessages(true), 8000);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (pickerOpen && destinations.length === 0) {
      Promise.all([apiFetch('/destinations'), apiFetch('/itineraries')])
        .then(async ([destinationsRes, itinerariesRes]) => {
          if (!destinationsRes.ok || !itinerariesRes.ok) throw new Error();
          setDestinations(await destinationsRes.json());
          setItineraries(await itinerariesRes.json());
        })
        .catch(() => setError('Could not load travel pins'));
    }
  }, [pickerOpen, destinations.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (
    event?: FormEvent,
    pin?: Destination | Itinerary,
    type: 'text' | 'location' | 'itinerary' = 'text',
  ) => {
    event?.preventDefault();
    if (!activeId || (!draft.trim() && !pin)) return;
    const payload = {
      conversation_id: activeId,
      body: pin
        ? `${type === 'location' ? 'Pinned location' : 'Shared itinerary'}: ${'name' in pin ? pin.name : pin.title}`
        : draft,
      message_type: type,
      place_id: type === 'location' ? pin?.id : null,
      itinerary_id: type === 'itinerary' ? pin?.id : null,
    };
    setDraft('');
    setPickerOpen(false);
    try {
      const res = await apiFetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Your message could not be sent');
      await Promise.all([loadMessages(), loadConversations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed');
    }
  };

  const openPicker = (tab: 'location' | 'itinerary') => {
    setPickerTab(tab);
    setPickerOpen(true);
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  const renderMessageBody = (message: Message) => {
    if (message.message_type === 'itinerary' && message.pin?.itinerary) {
      const itinerary = message.pin.itinerary;
      return (
        <div className="shared-itinerary">
          <img src={itinerary.image_url} alt="" />
          <div>
            <span>
              <Route /> Pinned itinerary · {itinerary.days} days
            </span>
            <strong>{language === 'kh' ? itinerary.title_kh : itinerary.title}</strong>
            <div className="itinerary-stops">
              {itinerary.stops.slice(0, 3).map((stop, index) => (
                <small key={stop}>
                  <i>{index + 1}</i>
                  {stop}
                </small>
              ))}
            </div>
            <button>
              Open journey <ChevronRight />
            </button>
          </div>
        </div>
      );
    }
    const place = message.pin?.destination || message.place;
    if ((message.message_type === 'location' || message.message_type === 'place') && place) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name}, ${place.province}, Cambodia`,
      )}`;
      return (
        <div className={`shared-place ${message.message_type === 'location' ? 'pinned-map-card' : ''}`}>
          <div className="map-card-visual">
            <Map />
            <span />
            <MapPin />
          </div>
          <img src={place.image_url} alt="" />
          <div>
            <span>
              <MapPinned /> {message.message_type === 'location' ? 'Pinned physical location' : 'Shared place'}
            </span>
            <strong>{language === 'kh' ? place.name_kh : place.name}</strong>
            <small>
              {place.province} · ★ {place.rating}
            </small>
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Open in Google Maps <ChevronRight />
            </a>
          </div>
        </div>
      );
    }
    return <p>{message.body}</p>;
  };

  return (
    <div className="messages-page page-shell">
      <section className={`conversation-sidebar ${mobileChatOpen ? 'mobile-hidden' : ''}`}>
        <header>
          <div>
            <span className="eyebrow">
              <MessageCircle size={14} /> SokSan social
            </span>
            <h1>{t('travelChat')}</h1>
          </div>
          <button>
            <Plus />
          </button>
        </header>
        <div className="chat-search">
          <Search />
          <input placeholder="Search conversations" />
        </div>
        <div className="chat-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            {t('all')}
          </button>
          <button className={filter === 'guides' ? 'active' : ''} onClick={() => setFilter('guides')}>
            {t('localGuides')}
          </button>
        </div>
        {loadingConversations ? (
          <LoadingState compact />
        ) : error && conversations.length === 0 ? (
          <ErrorState message={error} onRetry={loadConversations} />
        ) : (
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={activeId === conversation.id ? 'active' : ''}
                onClick={() => {
                  setActiveId(conversation.id);
                  setMobileChatOpen(true);
                }}
              >
                <div className="avatar-wrap">
                  <img src={conversation.avatar_url} alt="" />
                  {conversation.active && <span />}
                </div>
                <div className="conversation-copy">
                  <div>
                    <strong>
                      {language === 'kh' && conversation.participant_name_kh
                        ? conversation.participant_name_kh
                        : conversation.participant_name}
                    </strong>
                    <time>{conversation.last_time}</time>
                  </div>
                  <p>{conversation.last_message}</p>
                  <small>{conversation.participant_role}</small>
                </div>
                {conversation.unread > 0 && <i>{conversation.unread}</i>}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={`chat-window ${mobileChatOpen ? 'mobile-open' : ''}`}>
        {activeConversation ? (
          <>
            <header className="chat-header">
              <button className="chat-back" onClick={() => setMobileChatOpen(false)}>
                <ArrowLeft />
              </button>
              <div className="avatar-wrap">
                <img src={activeConversation.avatar_url} alt="" />
                {activeConversation.active && <span />}
              </div>
              <div>
                <strong>
                  {language === 'kh' && activeConversation.participant_name_kh
                    ? activeConversation.participant_name_kh
                    : activeConversation.participant_name}
                </strong>
                <small>{activeConversation.active ? t('activeNow') : activeConversation.participant_role}</small>
              </div>
              <button>
                <Ellipsis />
              </button>
            </header>
            <div className="message-canvas">
              <div className="conversation-day">Today · a quiet plan taking shape</div>
              {loadingMessages ? (
                <LoadingState compact />
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`message-row ${message.sender_type === 'me' ? 'mine' : ''}`}>
                    <div className="message-bubble">
                      {renderMessageBody(message)}
                      <time>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.sender_type === 'me' && <CheckCheck />}
                      </time>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>
            {error && (
              <div className="inline-error">
                {error}
                <button onClick={() => setError('')}>
                  <X />
                </button>
              </div>
            )}
            <form className="message-composer" onSubmit={(event) => sendMessage(event)}>
              <div className="composer-tools">
                <button type="button">
                  <Smile />
                </button>
                <button type="button">
                  <Paperclip />
                </button>
                <button type="button" className="share-place-button" onClick={() => openPicker('location')}>
                  <Plus />
                  <MapPinned />
                  <span>{t('pinLocation')}</span>
                </button>
                <button type="button" className="share-itinerary-button" onClick={() => openPicker('itinerary')}>
                  <Route />
                  <span>{t('shareItinerary')}</span>
                </button>
              </div>
              <div className="composer-input">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('typeMessage')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button type="button" className="camera">
                  <Camera />
                </button>
                <button className="send-button" type="submit" disabled={!draft.trim()}>
                  <Send />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <MessageCircle />
            <h2>Choose a conversation</h2>
            <p>Travel is better when ideas are shared.</p>
          </div>
        )}
      </section>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              className="place-picker pin-picker"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span className="eyebrow">
                    <MapPinned /> Seller shortcuts
                  </span>
                  <h2>{t('choosePlace')}</h2>
                </div>
                <button onClick={() => setPickerOpen(false)}>
                  <X />
                </button>
              </header>
              <div className="pin-picker-tabs">
                <button className={pickerTab === 'location' ? 'active' : ''} onClick={() => setPickerTab('location')}>
                  <MapPin /> Physical locations
                </button>
                <button className={pickerTab === 'itinerary' ? 'active' : ''} onClick={() => setPickerTab('itinerary')}>
                  <Route /> Itineraries
                </button>
              </div>
              <div className="pin-picker-list">
                {destinations.length === 0 ? (
                  <LoadingState compact />
                ) : pickerTab === 'location' ? (
                  destinations.map((destination) => (
                    <button key={destination.id} onClick={() => sendMessage(undefined, destination, 'location')}>
                      <img src={destination.image_url} alt="" />
                      <div>
                        <strong>{language === 'kh' ? destination.name_kh : destination.name}</strong>
                        <small>
                          {destination.province} · ★ {destination.rating}
                        </small>
                        <span>
                          <MapPinned /> Pin Google Maps layout
                        </span>
                      </div>
                      <Send />
                    </button>
                  ))
                ) : (
                  itineraries.map((itinerary) => (
                    <button key={itinerary.id} onClick={() => sendMessage(undefined, itinerary, 'itinerary')}>
                      <img src={itinerary.image_url} alt="" />
                      <div>
                        <strong>{language === 'kh' ? itinerary.title_kh : itinerary.title}</strong>
                        <small>
                          {itinerary.province} · {itinerary.days} days · ${itinerary.price}
                        </small>
                        <span>
                          <Clock3 /> {itinerary.stops.length} curated stops
                        </span>
                      </div>
                      <Send />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
