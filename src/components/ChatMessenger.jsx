import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Check,
  CheckCircle,
  Tag,
  MapPin,
  RotateCcw,
  ExternalLink,
  Search,
  ArrowLeft,
  ShieldCheck,
  Clock,
  ChevronRight
} from 'lucide-react';
import {
  getUser,
  getChats,
  getChat,
  sendMessage,
  makeOffer,
  respondToOffer,
  markChatProductSold,
  markChatRead,
  getProduct
} from '../services/marketplaceStore';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
}

export default function ChatMessenger({ isOpen, onClose, activeChatId, onSelectChat }) {
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [chats, setChats] = useState(() => getChats(currentUser?.userId));
  const [currentChatId, setCurrentChatId] = useState(activeChatId || null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Offer modal inside chat
  const [showOfferDrawer, setShowOfferDrawer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerLocation, setOfferLocation] = useState('Central Campus Library (2nd Floor)');
  const [offerCustomNote, setOfferCustomNote] = useState('');

  // Counter-offer prompt
  const [counterTargetMsgId, setCounterTargetMsgId] = useState(null);
  const [counterAmountInput, setCounterAmountInput] = useState('');

  const messagesEndRef = useRef(null);

  // Sync user and chats on store_update and chat_update
  useEffect(() => {
    const sync = () => {
      const u = getUser();
      setCurrentUser(u);
      const c = getChats(u?.userId);
      setChats(c);
    };
    window.addEventListener('chat_update', sync);
    window.addEventListener('store_update', sync);
    return () => {
      window.removeEventListener('chat_update', sync);
      window.removeEventListener('store_update', sync);
    };
  }, []);

  // Update currentChatId when activeChatId prop changes or when chats load
  useEffect(() => {
    if (activeChatId) {
      setCurrentChatId(activeChatId);
    } else if (!currentChatId && chats.length > 0) {
      setCurrentChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  // Mark chat read when opened
  useEffect(() => {
    if (currentChatId && currentUser?.userId) {
      markChatRead(currentChatId, currentUser.userId);
    }
  }, [currentChatId, currentUser?.userId]);

  // Scroll to bottom whenever active chat or messages change
  const activeChat = useMemo(() => {
    if (!currentChatId) return null;
    return chats.find(c => c.id === currentChatId) || getChat(currentChatId);
  }, [currentChatId, chats]);

  const activeProduct = useMemo(() => {
    if (!activeChat?.productId) return null;
    return getProduct(activeChat.productId);
  }, [activeChat]);

  useEffect(() => {
    if (activeChat?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages?.length, currentChatId]);

  if (!isOpen) return null;

  const filteredChats = chats.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherName = c.buyerId === currentUser?.userId ? c.sellerName : c.buyerName;
    return (
      (otherName && otherName.toLowerCase().includes(q)) ||
      (c.productTitle && c.productTitle.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const isCurrentBuyer = activeChat?.buyerId === currentUser?.userId;
  const isCurrentSeller = activeChat?.sellerId === currentUser?.userId;
  const otherPartyName = isCurrentBuyer ? activeChat?.sellerName : activeChat?.buyerName;

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeChat || !currentUser) return;
    sendMessage(activeChat.id, {
      senderId: currentUser.userId,
      text: inputMessage.trim(),
      type: 'text'
    });
    setInputMessage('');
  };

  const handleQuickCampusReply = (chipText) => {
    if (!activeChat || !currentUser) return;
    sendMessage(activeChat.id, {
      senderId: currentUser.userId,
      text: chipText,
      type: 'text'
    });
  };

  const handleSubmitOffer = (e) => {
    if (e) e.preventDefault();
    const amt = parseFloat(offerAmount);
    if (isNaN(amt) || amt <= 0 || !activeChat || !currentUser) return;

    const fullNote = `${offerLocation}${offerCustomNote ? ` • ${offerCustomNote.trim()}` : ''}`;
    makeOffer(activeChat.id, {
      buyerId: currentUser.userId,
      amount: amt,
      note: fullNote
    });

    setShowOfferDrawer(false);
    setOfferAmount('');
    setOfferCustomNote('');
  };

  const handleAcceptOffer = (msgId) => {
    if (!activeChat || !currentUser) return;
    respondToOffer(activeChat.id, msgId, 'accept', { actorId: currentUser.userId });
  };

  const handleDeclineOffer = (msgId) => {
    if (!activeChat || !currentUser) return;
    respondToOffer(activeChat.id, msgId, 'decline', { actorId: currentUser.userId });
  };

  const handleOpenCounter = (msgId, defaultAmount) => {
    setCounterTargetMsgId(msgId);
    setCounterAmountInput(defaultAmount ? String(defaultAmount) : '');
  };

  const handleSubmitCounter = (msgId) => {
    const amt = parseFloat(counterAmountInput);
    if (isNaN(amt) || amt <= 0 || !activeChat || !currentUser) return;
    respondToOffer(activeChat.id, msgId, 'counter', {
      counterAmount: amt,
      actorId: currentUser.userId
    });
    setCounterTargetMsgId(null);
    setCounterAmountInput('');
  };

  const handleMarkSoldToBuyer = (msgId) => {
    if (!activeChat || !currentUser) return;
    if (window.confirm(`Confirm marking "${activeChat.productTitle}" as SOLD to ${activeChat.buyerName}? This will mark the listing as Sold across the marketplace.`)) {
      markChatProductSold(activeChat.id, msgId, currentUser.userId);
    }
  };

  const applyDiscountPill = (pct) => {
    const base = activeProduct?.price || activeChat?.productPrice || 50;
    const discounted = Math.max(1, Math.round(base * (1 - pct / 100)));
    setOfferAmount(String(discounted));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 920,
          height: '84vh',
          maxHeight: 700,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--gray-200)'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: 'var(--blue-900)',
            color: '#ffffff',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={17} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '0.01em' }}>
                Campus Chat & Offers
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                Peer-to-Peer Verified Student Commerce
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Messenger"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messenger Body: Dual Pane */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar: Threads List */}
          <div
            style={{
              width: 320,
              minWidth: 280,
              borderRight: '1px solid var(--gray-200)',
              background: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Search conversations */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--gray-200)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: '6px 10px',
                  border: '1px solid var(--gray-200)'
                }}
              >
                <Search size={14} color="var(--gray-400)" style={{ marginRight: 6 }} />
                <input
                  type="text"
                  placeholder="Filter conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.8125rem'
                  }}
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChats.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--gray-500)' }}>
                  <MessageSquare size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 4px' }}>
                    No conversations found
                  </p>
                  <p style={{ fontSize: '0.75rem', margin: 0 }}>
                    Click "Chat with Seller" or "Make an Offer" on any listing to start.
                  </p>
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isSelected = c.id === currentChatId;
                  const isBuyer = c.buyerId === currentUser?.userId;
                  const otherName = isBuyer ? c.sellerName : c.buyerName;
                  const unread = currentUser?.userId ? c.unreadCount?.[currentUser.userId] || 0 : 0;
                  const hasPendingOffer = c.messages?.some(m => m.offerData?.status === 'pending');
                  const hasAcceptedOffer = c.messages?.some(m => m.offerData?.status === 'accepted');

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setCurrentChatId(c.id);
                        if (onSelectChat) onSelectChat(c.id);
                      }}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--gray-200)',
                        background: isSelected ? '#EEF2FF' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isSelected ? 'var(--blue-800)' : 'var(--gray-200)',
                            color: isSelected ? '#ffffff' : 'var(--gray-700)',
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {otherName?.charAt(0) || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span
                              style={{
                                fontWeight: unread > 0 ? 800 : 600,
                                fontSize: '0.875rem',
                                color: 'var(--gray-900)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {otherName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', flexShrink: 0 }}>
                              {formatMessageTime(c.updatedAt)}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--gray-500)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: 4
                            }}
                          >
                            Listing: {c.productTitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: unread > 0 ? 'var(--blue-900)' : 'var(--gray-600)',
                                fontWeight: unread > 0 ? 700 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '170px'
                              }}
                            >
                              {c.lastMessage || 'Conversation started'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {hasPendingOffer && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    background: '#FEF3C7',
                                    color: '#92400E',
                                    padding: '1px 5px',
                                    borderRadius: 4
                                  }}
                                >
                                  Offer
                                </span>
                              )}
                              {hasAcceptedOffer && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    background: '#DCFCE7',
                                    color: '#166534',
                                    padding: '1px 5px',
                                    borderRadius: 4
                                  }}
                                >
                                  Accepted
                                </span>
                              )}
                              {unread > 0 && (
                                <span
                                  style={{
                                    background: 'var(--red-600)',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    borderRadius: 9999,
                                    minWidth: 18,
                                    height: 18,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px'
                                  }}
                                >
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat View */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', position: 'relative' }}>
            {activeChat ? (
              <>
                {/* Active Chat Header */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--gray-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--blue-800)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {otherPartyName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>
                          {otherPartyName}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            color: '#15803D',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 9999
                          }}
                        >
                          <ShieldCheck size={11} /> Verified Student
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        Role: {isCurrentBuyer ? 'Seller' : 'Buyer'} • Kota Damansara Campus
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isCurrentBuyer && activeProduct?.status !== 'sold' && !activeProduct?.nonNegotiable && (
                      <button
                        onClick={() => setShowOfferDrawer(true)}
                        className="btn-outline"
                        style={{
                          height: 32,
                          fontSize: '0.75rem',
                          padding: '0 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          borderColor: 'var(--blue-800)',
                          color: 'var(--blue-800)',
                          fontWeight: 700
                        }}
                      >
                        <Tag size={13} />
                        Make an Offer
                      </button>
                    )}
                    {activeProduct?.nonNegotiable && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          padding: '3px 8px',
                          borderRadius: 6
                        }}
                      >
                        Fixed Price
                      </span>
                    )}
                  </div>
                </div>

                {/* Pinned Product Banner */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderBottom: '1px solid var(--gray-200)',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <img
                      src={activeChat.productImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&auto=format&fit=crop&q=80'}
                      alt={activeChat.productTitle}
                      style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--gray-200)' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&auto=format&fit=crop&q=80'; }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          color: 'var(--gray-900)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {activeChat.productTitle}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--blue-900)' }}>
                          RM {Number(activeProduct?.price ?? activeChat.productPrice).toFixed(2)}
                        </span>
                        <span
                          className={`tag ${activeProduct?.status === 'sold' ? 'tag-sold' : 'tag-available'}`}
                          style={{ fontSize: '0.6875rem', padding: '1px 6px' }}
                        >
                          {activeProduct?.status === 'sold' ? 'Sold Out' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/product/${activeChat.productId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                      flexShrink: 0
                    }}
                  >
                    View Listing <ExternalLink size={12} />
                  </a>
                </div>

                {/* Messages Stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: '#FAFAFA'
                  }}
                >
                  {/* Campus Safe Meetup Advisory */}
                  <div
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      color: '#1E40AF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Campus Safety First:</strong> Conduct inspections and transactions in busy campus areas like the Library, Student Hub, or Cafeteria.
                    </span>
                  </div>

                  {activeChat.messages?.map((msg) => {
                    if (msg.type === 'system') {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: 'center',
                            background: '#E2E8F0',
                            color: '#334155',
                            padding: '6px 14px',
                            borderRadius: 9999,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            maxWidth: '90%',
                            textAlign: 'center',
                            margin: '4px 0'
                          }}
                        >
                          {msg.text}
                        </div>
                      );
                    }

                    if (msg.type === 'offer' && msg.offerData) {
                      const offer = msg.offerData;
                      const isSender = msg.senderId === currentUser?.userId;
                      const originalPrice = offer.originalPrice || activeProduct?.price || 50;
                      const discountPct = Math.round(((originalPrice - offer.amount) / originalPrice) * 100);

                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isSender ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            width: 380,
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: '1px solid var(--gray-300)',
                            background: '#ffffff',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {/* Offer Card Top Banner */}
                          <div
                            style={{
                              background:
                                offer.status === 'accepted'
                                  ? '#DCFCE7'
                                  : offer.status === 'declined'
                                  ? '#FEE2E2'
                                  : '#FEF3C7',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(0,0,0,0.06)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Tag
                                size={14}
                                color={
                                  offer.status === 'accepted'
                                    ? '#15803D'
                                    : offer.status === 'declined'
                                    ? '#B91C1C'
                                    : '#B45309'
                                }
                              />
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color:
                                    offer.status === 'accepted'
                                      ? '#15803D'
                                      : offer.status === 'declined'
                                      ? '#B91C1C'
                                      : '#B45309'
                                }}
                              >
                                {offer.status === 'accepted'
                                  ? 'OFFER ACCEPTED'
                                  : offer.status === 'declined'
                                  ? 'OFFER DECLINED'
                                  : offer.status === 'countered'
                                  ? 'COUNTER-OFFER PROPOSED'
                                  : 'CAMPUS BUYER OFFER'}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: '#ffffff'
                              }}
                            >
                              {offer.status}
                            </span>
                          </div>

                          {/* Offer Card Details */}
                          <div style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--blue-900)' }}>
                                RM {Number(offer.amount).toFixed(2)}
                              </span>
                              {discountPct > 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--green-700)', fontWeight: 700 }}>
                                  ({discountPct}% off listed RM {Number(originalPrice).toFixed(2)})
                                </span>
                              )}
                            </div>

                            {offer.note && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 6,
                                  fontSize: '0.78125rem',
                                  color: 'var(--gray-700)',
                                  marginBottom: 10,
                                  background: 'var(--gray-50)',
                                  padding: '8px 10px',
                                  borderRadius: 6
                                }}
                              >
                                <MapPin size={14} color="var(--red-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{offer.note}</span>
                              </div>
                            )}

                            {/* Seller Action Buttons */}
                            {isCurrentSeller && offer.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleAcceptOffer(msg.id)}
                                  style={{
                                    flex: 1,
                                    height: 34,
                                    fontSize: '0.78125rem',
                                    background: 'var(--green-600)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Check size={14} /> Accept
                                </button>
                                <button
                                  className="btn-outline"
                                  onClick={() => handleOpenCounter(msg.id, Math.round((Number(offer.amount) + originalPrice) / 2))}
                                  style={{
                                    height: 34,
                                    fontSize: '0.78125rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <RotateCcw size={13} /> Counter
                                </button>
                                <button
                                  className="btn-ghost"
                                  onClick={() => handleDeclineOffer(msg.id)}
                                  style={{
                                    height: 34,
                                    fontSize: '0.78125rem',
                                    color: 'var(--red-600)'
                                  }}
                                >
                                  Decline
                                </button>
                              </div>
                            )}

                            {/* Counter offer inline input */}
                            {counterTargetMsgId === msg.id && (
                              <div style={{ marginTop: 10, padding: 10, background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                                  Propose Counter-Offer (RM):
                                </label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={counterAmountInput}
                                    onChange={(e) => setCounterAmountInput(e.target.value)}
                                    placeholder="e.g. 40"
                                    style={{
                                      flex: 1,
                                      height: 32,
                                      padding: '0 8px',
                                      fontSize: '0.8125rem',
                                      borderRadius: 6,
                                      border: '1px solid var(--gray-300)'
                                    }}
                                  />
                                  <button
                                    className="btn-primary"
                                    onClick={() => handleSubmitCounter(msg.id)}
                                    style={{ height: 32, fontSize: '0.75rem', padding: '0 12px' }}
                                  >
                                    Send
                                  </button>
                                  <button
                                    className="btn-ghost"
                                    onClick={() => setCounterTargetMsgId(null)}
                                    style={{ height: 32, fontSize: '0.75rem' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Seller Milestone: "Mark as Sold to Buyer" */}
                            {isCurrentSeller && offer.status === 'accepted' && activeProduct?.status !== 'sold' && (
                              <div
                                style={{
                                  marginTop: 10,
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: 8,
                                  padding: 10
                                }}
                              >
                                <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 700, marginBottom: 6 }}>
                                  Deal Accepted! Finalize Campus Lifecycle:
                                </div>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleMarkSoldToBuyer(msg.id)}
                                  style={{
                                    width: '100%',
                                    height: 36,
                                    fontSize: '0.8125rem',
                                    background: 'var(--red-600)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                  }}
                                >
                                  <CheckCircle size={15} />
                                  Mark as Sold to {activeChat.buyerName}
                                </button>
                              </div>
                            )}

                            {/* Status after completion */}
                            {offer.status === 'accepted' && activeProduct?.status === 'sold' && (
                              <div
                                style={{
                                  marginTop: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  color: 'var(--green-700)',
                                  fontSize: '0.78125rem',
                                  fontWeight: 700
                                }}
                              >
                                <CheckCircle size={15} />
                                Transaction completed and listing closed.
                              </div>
                            )}

                            <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: 8, textAlign: 'right' }}>
                              {formatMessageTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Standard text message bubble
                    const isSender = msg.senderId === currentUser?.userId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isSender ? 'flex-end' : 'flex-start',
                          maxWidth: '72%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSender ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            background: isSender ? 'var(--blue-900)' : '#ffffff',
                            color: isSender ? '#ffffff' : 'var(--gray-900)',
                            padding: '10px 14px',
                            borderRadius: isSender ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                            boxShadow: 'var(--shadow-sm)',
                            border: isSender ? 'none' : '1px solid var(--gray-200)',
                            fontSize: '0.875rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: 3, padding: '0 4px' }}>
                          {formatMessageTime(msg.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Campus Reply Chips */}
                <div
                  style={{
                    padding: '8px 14px',
                    borderTop: '1px solid var(--gray-200)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflowX: 'auto',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600 }}>Quick Replies:</span>
                  {[
                    'Can we meet at the Central Library?',
                    'Are you free today at the Student Hub?',
                    activeProduct?.nonNegotiable ? 'Is this still available for meetup?' : 'Is the price negotiable?',
                    'Can I inspect before payment?'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickCampusReply(chip)}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid var(--gray-200)',
                        borderRadius: 9999,
                        padding: '4px 10px',
                        fontSize: '0.71875rem',
                        color: 'var(--gray-700)',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '12px 14px',
                    borderTop: '1px solid var(--gray-200)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {isCurrentBuyer && activeProduct?.status !== 'sold' && !activeProduct?.nonNegotiable && (
                    <button
                      type="button"
                      onClick={() => setShowOfferDrawer(true)}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: 8,
                        padding: '0 10px',
                        height: 40,
                        color: 'var(--blue-800)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="Make an Offer"
                    >
                      <Tag size={14} /> Offer
                    </button>
                  )}

                  <input
                    type="text"
                    placeholder={`Message ${otherPartyName || 'student'}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 20,
                      border: '1px solid var(--gray-300)',
                      padding: '0 16px',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: inputMessage.trim() ? 'var(--blue-900)' : 'var(--gray-200)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: inputMessage.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', padding: 32 }}>
                <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ margin: '0 0 6px', color: 'var(--gray-700)', fontSize: '1.05rem' }}>Select a Campus Conversation</h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', textAlign: 'center', maxWidth: 300 }}>
                  Choose a chat from the left panel to review messages, negotiate prices, or complete an offer.
                </p>
              </div>
            )}

            {/* In-Chat Offer Modal / Drawer */}
            {showOfferDrawer && activeChat && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.7)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  zIndex: 20
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    width: '100%',
                    maxWidth: 420,
                    padding: 20,
                    boxShadow: 'var(--shadow-xl)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={18} color="var(--blue-900)" />
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Make an Offer</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOfferDrawer(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', margin: '0 0 12px', lineHeight: 1.45 }}>
                    Propose a fair offer for <strong>{activeChat.productTitle}</strong>. Listed price: <strong>RM {Number(activeProduct?.price ?? activeChat.productPrice).toFixed(2)}</strong>.
                  </p>

                  {/* Quick percentage pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyDiscountPill(pct)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid var(--gray-300)',
                          background: '#F8FAFC',
                          color: 'var(--gray-700)',
                          cursor: 'pointer'
                        }}
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmitOffer}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 4 }}>
                        Offer Amount (RM) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                          RM
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          required
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder="e.g. 35"
                          style={{
                            width: '100%',
                            height: 40,
                            paddingLeft: 42,
                            paddingRight: 12,
                            borderRadius: 8,
                            border: '1px solid var(--gray-300)',
                            fontSize: '0.9375rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 4 }}>
                        Campus Meetup Location
                      </label>
                      <select
                        value={offerLocation}
                        onChange={(e) => setOfferLocation(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid var(--gray-300)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <option value="Central Campus Library (2nd Floor)">Central Campus Library (2nd Floor)</option>
                        <option value="Student Hub Cafeteria">Student Hub Cafeteria</option>
                        <option value="Main Tower Entrance">Main Tower Entrance</option>
                        <option value="Faculty of Engineering Block">Faculty of Engineering Block</option>
                        <option value="Hostel / Dormitory Lobby">Hostel / Dormitory Lobby</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 4 }}>
                        Optional Meetup Note / Availability
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Can meet tomorrow 2pm between lectures"
                        value={offerCustomNote}
                        onChange={(e) => setOfferCustomNote(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: '1px solid var(--gray-300)',
                          fontSize: '0.8125rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setShowOfferDrawer(false)}
                        style={{ flex: 1, height: 40 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={!offerAmount || parseFloat(offerAmount) <= 0}
                        style={{ flex: 1, height: 40 }}
                      >
                        Submit Offer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
