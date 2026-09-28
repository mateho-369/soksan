import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Phone } from 'lucide-react';
import type { Contact } from '../types';

export default function ContactActions({ contact }: { contact: Contact | null }) {
  const navigate = useNavigate();
  if (!contact) return null;
  return (
    <div className="contact-actions">
      <button className="native-contact" onClick={() => navigate('/messages')}>
        <MessageCircle /> <span>Native SokSan Chat</span>
      </button>
      <a className="telegram-contact" href={contact.telegram_url} target="_blank" rel="noreferrer">
        <Send /> <span>Message via Telegram</span>
      </a>
      <a className="call-contact" href={`tel:${contact.phone}`}>
        <Phone /> <span>Direct Call</span>
      </a>
      <small>Typically replies {contact.response_time}</small>
    </div>
  );
}
